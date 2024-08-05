import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Asset } from '../models/asset';

const getConfigFilePath = (): string => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('No workspace folder open');
    throw new Error('No workspace folder open');
  }
  return path.join(workspaceFolders[0].uri.fsPath, '.cryptoTrendNotifier.json');
};

const defaultConfig = {
  assets: [] as Asset[],
  currency: 'usd',
  threshold: 3,
  interval: 60
};

const ensureConfigFileExists = async (configPath: string) => {
  if (!fs.existsSync(configPath)) {
    await fs.promises.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
  }
};

export const readConfig = async (): Promise<any> => {
  const configPath = getConfigFilePath();
  try {
    await ensureConfigFileExists(configPath);
    const configFile = await fs.promises.readFile(configPath, 'utf-8');
    return JSON.parse(configFile);
  } catch (error) {
    vscode.window.showErrorMessage('Failed to read configuration file');
    throw error;
  }
};

export const writeConfig = async (config: any) => {
  const configPath = getConfigFilePath();
  try {
    await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    vscode.window.showErrorMessage('Failed to write configuration file');
    throw error;
  }
};

export const openConfig = async () => {
  const configPath = getConfigFilePath();
  await ensureConfigFileExists(configPath);
  const document = await vscode.workspace.openTextDocument(configPath);
  await vscode.window.showTextDocument(document);
};
