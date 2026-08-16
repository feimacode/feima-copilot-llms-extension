/*---------------------------------------------------------------------------------------------
 *  Copyright (c) FeimaCode. All rights reserved.
 *  Licensed under the MIT License.
 *
 *  Tree data provider for the "Local & Enterprise Models" view — a
 *  read-mostly consumer of LocalEndpointRegistry/LocalEndpointProvider's
 *  existing public surface. See openspec/changes/add-endpoint-management-view.
 *
 *  Implementation note on "targeted refresh": design.md frames
 *  `onDidChangeHealth` as enabling a "targeted single-node refresh." In
 *  practice this provider fires a whole-tree refresh either way — nodes are
 *  freshly built plain objects on each `getChildren` call, not cached
 *  instances with stable identity, so there is nothing cheaper to target at
 *  the tiny scale this list is expected to be (a handful of registered
 *  endpoints). What `onDidChangeHealth` actually buys is firing on *more*
 *  occasions than `onDidChangeEntries` alone would (any health change, not
 *  just add/remove) — that is the real benefit, not per-node DOM targeting.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ILogService } from '../../../platform/log/common/logService';
import { LocalEndpointRegistry } from '../localEndpointRegistry';
import { LocalEndpointProvider } from '../localEndpointProvider';
import { LocalEndpointEntry, MetadataConfidence } from '../types';
import { groupEntries } from './treeGrouping';

export type EndpointScope = 'personal' | 'team';

export interface GroupTreeNode {
	readonly kind: 'group';
	readonly scope: EndpointScope;
}

export interface EntryTreeNode {
	readonly kind: 'entry';
	readonly scope: EndpointScope;
	readonly entry: LocalEndpointEntry;
}

export interface ModelTreeNode {
	readonly kind: 'model';
	readonly info: vscode.LanguageModelChatInformation;
	readonly confidence: MetadataConfidence | undefined;
	readonly scope: EndpointScope;
	readonly entryId: string;
	readonly rawModelId: string;
	/** Has a user-authored override, whether or not the endpoint also reports this id live. */
	readonly isOverride: boolean;
	/** Override exists AND the endpoint's own model-list response doesn't report this id. */
	readonly isManualOnly: boolean;
}

export type EndpointTreeNode = GroupTreeNode | EntryTreeNode | ModelTreeNode;

const HEALTH_ICONS = {
	reachable: new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('testing.iconPassed')),
	unreachable: new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed')),
	unknown: new vscode.ThemeIcon('circle-outline'),
};

export class LocalEndpointTreeProvider implements vscode.TreeDataProvider<EndpointTreeNode> {
	private readonly _onDidChangeTreeData = new vscode.EventEmitter<EndpointTreeNode | undefined>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

	private _eagerPopulateDone = false;

	constructor(
		private readonly registry: LocalEndpointRegistry,
		private readonly localProvider: LocalEndpointProvider,
		private readonly log: ILogService,
	) {
		registry.onDidChangeEntries(() => this._onDidChangeTreeData.fire(undefined));
		registry.onDidChangeHealth(() => this._onDidChangeTreeData.fire(undefined));
		localProvider.onDidChangeLanguageModelChatInformation(() => this._onDidChangeTreeData.fire(undefined));
	}

	/** Called once when the view first becomes visible — see design.md "Eager population on activation". */
	async ensurePopulated(token: vscode.CancellationToken): Promise<void> {
		if (this._eagerPopulateDone) {
			return;
		}
		this._eagerPopulateDone = true;
		try {
			await this.localProvider.provideLanguageModelChatInformation({ silent: true }, token);
		} catch (error) {
			this.log.error(error as Error, '[LocalEndpointTreeProvider] Eager population failed');
		}
	}

	getChildren(element?: EndpointTreeNode): EndpointTreeNode[] {
		if (!element) {
			return this._rootChildren();
		}
		if (element.kind === 'group') {
			const { personal, team } = groupEntries(this.registry.entries);
			const entries = element.scope === 'personal' ? personal : team;
			return entries.map(entry => ({ kind: 'entry', scope: element.scope, entry }));
		}
		if (element.kind === 'entry') {
			const entryId = element.entry.id;
			return this.localProvider.getCachedModelsForEntry(entryId).map(info => {
				const rawModelId = info.id.slice(entryId.length + 2);
				const override = this.registry.getModelOverride(entryId, rawModelId);
				return {
					kind: 'model',
					info,
					confidence: this.localProvider.getCandidateSource(info.id)?.confidence,
					scope: element.scope,
					entryId,
					rawModelId,
					isOverride: override !== undefined,
					isManualOnly: override?.manual === true,
				};
			});
		}
		return [];
	}

	private _rootChildren(): EndpointTreeNode[] {
		const { personal, team } = groupEntries(this.registry.entries);
		// Only introduce the group-node layer when there's more than one scope
		// to distinguish — the common case (personal entries only) lists them
		// directly, avoiding a redundant single "Personal" wrapper every user
		// would otherwise always see (see design.md's grouping decision;
		// this is a minor UX refinement on top of it, not a spec deviation —
		// the spec requires distinguishable groupings only when both exist).
		if (team.length === 0) {
			return personal.map(entry => ({ kind: 'entry', scope: 'personal', entry }));
		}
		return [{ kind: 'group', scope: 'personal' }, { kind: 'group', scope: 'team' }];
	}

	getTreeItem(element: EndpointTreeNode): vscode.TreeItem {
		if (element.kind === 'group') {
			const item = new vscode.TreeItem(
				element.scope === 'personal' ? vscode.l10n.t('Personal') : vscode.l10n.t('Team-Shared'),
				vscode.TreeItemCollapsibleState.Expanded,
			);
			item.contextValue = element.scope === 'personal' ? 'personalGroup' : 'teamGroup';
			return item;
		}

		if (element.kind === 'entry') {
			const { entry, scope } = element;
			const health = this.registry.getHealth(entry.id);
			const modelCount = this.localProvider.getCachedModelsForEntry(entry.id).length;

			const item = new vscode.TreeItem(entry.label ?? entry.baseEndpoint, vscode.TreeItemCollapsibleState.Collapsed);
			item.description = modelCount > 0
				? vscode.l10n.t('{0} model(s)', modelCount)
				: entry.baseEndpoint;
			item.tooltip = entry.baseEndpoint;
			item.iconPath = health === undefined ? HEALTH_ICONS.unknown : (health.reachable ? HEALTH_ICONS.reachable : HEALTH_ICONS.unreachable);
			item.contextValue = scope === 'personal' ? 'personalEndpoint' : 'teamEndpoint';
			return item;
		}

		// model
		const item = new vscode.TreeItem(element.info.name, vscode.TreeItemCollapsibleState.None);
		const marker = element.isManualOnly ? 'manual' : element.isOverride ? 'edited' : element.confidence;
		item.description = marker ?? '';
		if (element.scope !== 'personal') {
			item.contextValue = 'endpointModelReadOnly';
		} else if (element.isManualOnly) {
			item.contextValue = 'endpointModelManual';
		} else if (element.isOverride) {
			item.contextValue = 'endpointModelOverridden';
		} else {
			item.contextValue = 'endpointModel';
		}
		return item;
	}
}
