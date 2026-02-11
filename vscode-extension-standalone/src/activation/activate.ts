import * as vscode from 'vscode';
import { removeOldToolbar } from '../auto-prompts/remove-old-toolbar';
import { getCurrentIDE } from 'src/utils/get-current-ide';
import {
  createTimeToUpgradePanel,
  shouldShowTimeToUpgrade,
} from '../webviews/time-to-upgrade';
import { StorageService } from 'src/services/storage-service';
import { VScodeContext } from 'src/services/vscode-context';
import { EnvironmentInfo } from 'src/services/environment-info';
import { WorkspaceService } from 'src/services/workspace-service';
import { PackageJsonScanner } from 'src/services/package-json-scanner';
import { AgentSelectorService } from 'src/services/agent-selector';
import {
  createGettingStartedPanel,
  shouldShowGettingStarted,
} from 'src/webviews/getting-started';
import { findAvailablePort } from 'src/utils/find-available-port';
import { createHttpServer } from 'src/server/http-server';
import type { Server } from 'node:http';

const STAGEWISE_HTTP_START_PORT = 5746;
let httpServer: Server | null = null;

// Diagnostic collection specifically for our fake prompt
const fakeDiagCollection =
  vscode.languages.createDiagnosticCollection('stagewise');

// Create output channel for stagewise
const outputChannel = vscode.window.createOutputChannel('stagewise');

async function removeOldToolbarHandler() {
  await removeOldToolbar();
  await vscode.window.showInformationMessage(
    "The agent has been triggered to remove the old integration of stagewise. Please follow the agent's instructions in the chat panel.",
    'OK',
  );
}

export async function activate(context: vscode.ExtensionContext) {
  try {
    VScodeContext.getInstance().initialize(context);
    await StorageService.getInstance().initialize();

    WorkspaceService.getInstance();
    await EnvironmentInfo.getInstance().initialize();

    const agentSelectorService = AgentSelectorService.getInstance();
    await agentSelectorService.initialize();

    const port = await findAvailablePort(STAGEWISE_HTTP_START_PORT);
    httpServer = createHttpServer(port);
    agentSelectorService.updateStatusbarText('Forward to IDE Chat');

    const ide = getCurrentIDE();
    if (ide === 'UNKNOWN') {
      vscode.window.showInformationMessage(
        'stagewise does not work for your current IDE.',
      );
      return;
    }
    context.subscriptions.push(fakeDiagCollection);
    context.subscriptions.push(outputChannel);

    const storage = StorageService.getInstance();

    if (await shouldShowGettingStarted(storage)) {
      createGettingStartedPanel(context, storage);
    }

    const showTimeToUpgradePanel = async () => {
      if (await shouldShowTimeToUpgrade(storage)) {
        createTimeToUpgradePanel(context, storage, removeOldToolbarHandler);
      }
    };

    if (vscode.workspace.workspaceFolders?.length) {
      const scanner = PackageJsonScanner.getInstance();
      const deprecatedPackages = await scanner.scanWorkspace();
      if (deprecatedPackages.length > 0) {
        await showTimeToUpgradePanel();
      }
    }

    const workspaceFolderListener =
      vscode.workspace.onDidChangeWorkspaceFolders(async () => {
        if (vscode.workspace.workspaceFolders?.length) {
          const scanner = PackageJsonScanner.getInstance();
          const deprecatedPackages = await scanner.scanWorkspace();
          if (deprecatedPackages.length > 0) {
            await showTimeToUpgradePanel();
          }
        }
      });
    context.subscriptions.push(workspaceFolderListener);

    const setAgentCommand = vscode.commands.registerCommand(
      'stagewise.setAgent',
      async () => {
        await agentSelectorService.showAgentPicker();
      },
    );
    context.subscriptions.push(setAgentCommand);
  } catch (error) {
    console.error('Error during extension activation:', error);
  }
}

export async function deactivate(_context: vscode.ExtensionContext) {
  try {
    if (httpServer) {
      httpServer.close();
      httpServer = null;
    }
  } catch (error) {
    console.error(
      'Error during extension deactivation:',
      error instanceof Error ? error.message : String(error),
    );
  }
}
