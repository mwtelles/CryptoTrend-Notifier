import * as vscode from 'vscode';

export class Notifier {
  notify(crypto: string, message: string) {
    vscode.window.showInformationMessage(`${crypto}: ${message}`);
  }
}
