/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Remote-extension-host detection. Both Ollama and LM Studio default-bind to
 *  127.0.0.1 for security (confirmed during design, not assumed) — when the
 *  extension host itself runs remotely (Remote-SSH/WSL, a dev container, or
 *  Codespaces), probing 127.0.0.1 reaches the remote machine, not the user's
 *  actual local machine. See design.md Risks: "Port-probing from a remote
 *  extension host cannot reach the user's actual local machine."
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/** True when the extension host is running in a remote context, not on the user's physical machine. */
export function isRemoteExtensionHost(): boolean {
	return !!vscode.env.remoteName;
}
