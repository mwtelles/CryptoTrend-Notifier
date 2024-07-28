import * as vscode from 'vscode';
import axios from 'axios';

class CryptoService {
  private apiUrl = 'https://api.coingecko.com/api/v3';

  async checkPriceChange(crypto: string): Promise<number> {
    try {
      const response = await axios.get(`${this.apiUrl}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          ids: crypto
        }
      });
      const data = response.data[0];
      return data.price_change_percentage_1h_in_currency;
    } catch (error) {
      console.error(`Error fetching data for ${crypto}:`, error);
      return 0;
    }
  }

  async getCurrentPrice(crypto: string): Promise<number> {
    try {
      const response = await axios.get(`${this.apiUrl}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          ids: crypto
        }
      });
      const data = response.data[0];
      return data.current_price;
    } catch (error) {
      console.error(`Error fetching data for ${crypto}:`, error);
      return 0;
    }
  }
}

class Notifier {
  notify(crypto: string, message: string) {
    vscode.window.showInformationMessage(`${crypto}: ${message}`);
  }
}

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('cryptoTrendNotifier');
  let cryptos = config.get<string[]>('cryptos') || [];
  const threshold = config.get<number>('threshold') || 3;
  const interval = config.get<number>('interval') || 60;

  const cryptoService = new CryptoService();
  const notifier = new Notifier();

  let intervalId: NodeJS.Timeout;

  const startMonitoring = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
    intervalId = setInterval(async () => {
      for (const crypto of cryptos) {
        const change = await cryptoService.checkPriceChange(crypto);
        if (Math.abs(change) >= threshold) {
          notifier.notify(crypto, `has changed by ${change.toFixed(2)}% in the last hour.`);
        }
      }
    }, interval * 1000);
  };

  const stopMonitoring = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  };

  const updateCryptos = async (newCryptos: string[]) => {
    cryptos = newCryptos;
    await config.update('cryptos', cryptos, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`Cryptocurrencies updated to: ${cryptos.join(', ')}`);
    startMonitoring();
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('cryptoTrendNotifier.start', startMonitoring),
    vscode.commands.registerCommand('cryptoTrendNotifier.stop', stopMonitoring),
    vscode.commands.registerCommand('cryptoTrendNotifier.configure', async () => {
      const cryptoInput = await vscode.window.showInputBox({
        placeHolder: 'Enter the cryptocurrencies to monitor, separated by commas (e.g., bitcoin,ethereum)'
      });

      if (cryptoInput) {
        const newCryptos = cryptoInput.split(',').map(c => c.trim());
        await updateCryptos(newCryptos);
      }
    }),
    vscode.commands.registerCommand('cryptoTrendNotifier.checkPrices', async () => {
      for (const crypto of cryptos) {
        const price = await cryptoService.getCurrentPrice(crypto);
        notifier.notify(crypto, `current price is $${price.toFixed(2)}`);
      }
    }),
    vscode.commands.registerCommand('cryptoTrendNotifier.addCrypto', async () => {
      const cryptoInput = await vscode.window.showInputBox({
        placeHolder: 'Enter the cryptocurrency to add (e.g., bitcoin)'
      });

      if (cryptoInput) {
        const newCryptos = [...cryptos, cryptoInput.trim()];
        await updateCryptos(newCryptos);
      }
    }),
    vscode.commands.registerCommand('cryptoTrendNotifier.removeCrypto', async () => {
      const cryptoInput = await vscode.window.showQuickPick(cryptos, {
        placeHolder: 'Select the cryptocurrency to remove'
      });

      if (cryptoInput) {
        const newCryptos = cryptos.filter(c => c !== cryptoInput);
        await updateCryptos(newCryptos);
      }
    }),
    vscode.commands.registerCommand('cryptoTrendNotifier.listCryptos', async () => {
      vscode.window.showInformationMessage(`Currently monitored cryptocurrencies: ${cryptos.join(', ')}`);
    })
  );

  if (cryptos.length > 0) {
    startMonitoring();
  }
}

export function deactivate() {}
