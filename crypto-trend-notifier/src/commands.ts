import * as vscode from 'vscode';
import { CryptoService } from './services/cryptoService';
import { Notifier } from './services/notifier';
import { readConfig, writeConfig, openConfig } from './utils/config';
import { Asset } from './models/asset';

let intervalId: NodeJS.Timeout;

const startMonitoring = async () => {
  const config = await readConfig();
  const assets: Asset[] = config.assets;
  const currency = config.currency;
  const threshold = config.threshold;
  const interval = config.interval;

  const cryptoService = new CryptoService();
  const notifier = new Notifier();

  if (intervalId) {
    clearInterval(intervalId);
  }

  intervalId = setInterval(async () => {
    for (const asset of assets) {
      const change = await cryptoService.checkPriceChange(asset.symbol, currency);
      const currentPrice = await cryptoService.getCurrentPrice(asset.symbol, currency);

      if (Math.abs(change) >= (asset.trendThreshold || threshold)) {
        notifier.notify(asset.name, `has changed by ${change.toFixed(2)}% in the last hour.`);
      }

      if (asset.buyPrice && currentPrice <= asset.buyPrice) {
        notifier.notify(asset.name, `is at or below the buy price of ${currency.toUpperCase()} ${asset.buyPrice}`);
      }

      if (asset.sellPrice && currentPrice >= asset.sellPrice) {
        notifier.notify(asset.name, `is at or above the sell price of ${currency.toUpperCase()} ${asset.sellPrice}`);
      }
    }
  }, interval * 1000);
};

const stopMonitoring = () => {
  if (intervalId) {
    clearInterval(intervalId);
  }
};

const checkPrices = async () => {
  const config = await readConfig();
  const assets: Asset[] = config.assets;
  const currency = config.currency;

  const cryptoService = new CryptoService();
  const notifier = new Notifier();

  for (const asset of assets) {
    const currentPrice = await cryptoService.getCurrentPrice(asset.symbol, currency);
    notifier.notify(asset.name, `current price is ${currency.toUpperCase()} ${currentPrice.toFixed(2)}`);
  }
};

const addAsset = async () => {
  const symbol = await vscode.window.showInputBox({ placeHolder: 'Enter the cryptocurrency symbol (e.g., btc)' });
  const nameInput = await vscode.window.showInputBox({ placeHolder: 'Enter the cryptocurrency name (optional)' });
  const amountInput = await vscode.window.showInputBox({ placeHolder: 'Enter the amount in your wallet (optional)' });
  const buyPriceInput = await vscode.window.showInputBox({ placeHolder: 'Enter the buy price (optional)' });
  const sellPriceInput = await vscode.window.showInputBox({ placeHolder: 'Enter the sell price (optional)' });
  const trendThresholdInput = await vscode.window.showInputBox({ placeHolder: 'Enter the trend threshold (optional)' });

  if (symbol) {
    const cryptoService = new CryptoService();
    const name = nameInput || await cryptoService.getCoinNameBySymbol(symbol.trim());

    if (name) {
      const config = await readConfig();
      const newAsset: Asset = {
        symbol: symbol.trim().toLowerCase(),
        name: name.trim(),
        amount: amountInput ? parseFloat(amountInput) : undefined,
        buyPrice: buyPriceInput ? parseFloat(buyPriceInput) : undefined,
        sellPrice: sellPriceInput ? parseFloat(sellPriceInput) : undefined,
        trendThreshold: trendThresholdInput ? parseFloat(trendThresholdInput) : undefined
      };
      const newAssets = [...config.assets, newAsset];
      await writeConfig({ ...config, assets: newAssets });
      startMonitoring();
    } else {
      vscode.window.showErrorMessage(`Could not find coin with symbol ${symbol}`);
    }
  }
};

const removeAsset = async () => {
  const config = await readConfig();
  const assetToRemove = await vscode.window.showQuickPick(
    config.assets.map((asset: { name: any; symbol: string; }) => `${asset.name} (${asset.symbol.toUpperCase()})`),
    { placeHolder: 'Select the cryptocurrency to remove' }
  );

  if (assetToRemove) {
    const newAssets = config.assets.filter((asset: { name: any; symbol: string; }) => `${asset.name} (${asset.symbol.toUpperCase()})` !== assetToRemove);
    await writeConfig({ ...config, assets: newAssets });
    startMonitoring();
  }
};

const listAssets = async () => {
  const config = await readConfig();
  vscode.window.showInformationMessage(
    `Currently monitored assets: ${config.assets.map((asset: { name: any; symbol: string; }) => `${asset.name} (${asset.symbol.toUpperCase()})`).join(', ')}`
  );
};

const getAsset = async () => {
  const symbol = await vscode.window.showInputBox({ placeHolder: 'Enter the cryptocurrency symbol to look up (e.g., btc)' });
  if (symbol) {
    const config = await readConfig();
    const asset = config.assets.find((asset: Asset) => asset.symbol === symbol.trim().toLowerCase());
    if (asset) {
      vscode.window.showInformationMessage(`Asset: ${asset.name} (${asset.symbol.toUpperCase()}) - Amount: ${asset.amount}`);
    } else {
      vscode.window.showErrorMessage(`Asset with symbol ${symbol} not found.`);
    }
  }
};

const getAllAssets = async () => {
  const config = await readConfig();
  vscode.window.showInformationMessage(
    `All assets: ${config.assets.map((asset: { name: any; symbol: string; amount: number }) => `${asset.name} (${asset.symbol.toUpperCase()}): ${asset.amount}`).join(', ')}`
  );
};

const getPortfolioValue = async () => {
  const config = await readConfig();
  const assets: Asset[] = config.assets;
  const currency = config.currency;

  const cryptoService = new CryptoService();
  let totalValue = 0;

  for (const asset of assets) {
    const currentPrice = await cryptoService.getCurrentPrice(asset.symbol, currency);
    if (asset.amount) {
      totalValue += asset.amount * currentPrice;
    }
  }

  vscode.window.showInformationMessage(`Current portfolio value: ${currency.toUpperCase()} ${totalValue.toFixed(2)}`);
};

export const registerCommands = (context: vscode.ExtensionContext) => {
  context.subscriptions.push(
    vscode.commands.registerCommand('cryptoTrendNotifier.start', startMonitoring),
    vscode.commands.registerCommand('cryptoTrendNotifier.stop', stopMonitoring),
    vscode.commands.registerCommand('cryptoTrendNotifier.checkPrices', checkPrices),
    vscode.commands.registerCommand('cryptoTrendNotifier.addAsset', addAsset),
    vscode.commands.registerCommand('cryptoTrendNotifier.removeAsset', removeAsset),
    vscode.commands.registerCommand('cryptoTrendNotifier.listAssets', listAssets),
    vscode.commands.registerCommand('cryptoTrendNotifier.openConfig', openConfig),
    vscode.commands.registerCommand('cryptoTrendNotifier.getAsset', getAsset),
    vscode.commands.registerCommand('cryptoTrendNotifier.getAllAssets', getAllAssets),
    vscode.commands.registerCommand('cryptoTrendNotifier.getPortfolioValue', getPortfolioValue)
  );
};
