/******************************************************************************* 
 * @license
 * Copyright (c) 2014 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*eslint-env browser, amd*/
define([
	'orion/objects',
	'i18n!orion/widgets/nls/messages',
	'text!orion/widgets/projects/RunBar.html',
	'orion/webui/littlelib',
	'orion/i18nUtil',
	'orion/webui/RichDropdown'
], function(objects, messages, RunBarTemplate, lib, i18nUtil, mRichDropdown) {
	
	/**
	 * Creates a new RunBar.
	 * @class RunBar
	 * @name orion.projects.RunBar
	 * @param options
	 * @param options.parentNode
	 * @param options.serviceRegistry
	 * @param options.commandRegistry
	 * @param options.fileClient
	 * @param options.progressService
	 * @param options.preferencesService
	 * @param options.statusService
	 * @param options.actionScopeId
	 */
	function RunBar(options) {
		this._parentNode = options.parentNode;
		this._projectExplorer = options.projectExplorer;
		this._serviceRegistry = options.serviceRegistry;
		this._commandRegistry = options.commandRegistry;
		this._fileClient = options.fileClient;
		this._progressService = options.progressService;
		this._preferencesService = options.preferencesService;
		this.statusService = options.statusService;
		this.actionScopeId = options.actionScopeId;
		this._projectCommands = options.projectCommands;
		this._projectClient = options.projectClient;
		
		this._initialize();
	}
	
	objects.mixin(RunBar.prototype, /** @lends orion.projects.RunBar.prototype */ {
		_initialize: function() {
			this._domNode = lib.createNodes(RunBarTemplate);
			if (this._domNode) {
				this._parentNode.appendChild(this._domNode);
				this._launchConfigurationsWrapper = lib.$(".launchConfigurationsWrapper", this._domNode); //$NON-NLS-0$
				
				this._statusLabel = lib.$(".statusLabel", this._domNode); //$NON-NLS-0$
				this._statusLabel.appendChild(document.createTextNode(messages["Running"])); //$NON-NLS-0$
				
				this._statusLight = lib.$(".statusLight", this._domNode); //$NON-NLS-0$
				
				
				this._playButton = lib.$("button.playButton", this._domNode); //$NON-NLS-0$
				this._boundPlayButtonListener = this._playButtonListener.bind(this);
				this._playButton.addEventListener("click", this._boundPlayButtonListener); //$NON-NLS-0$ 
				
				this._stopButton = lib.$("button.stopButton", this._domNode); //$NON-NLS-0$
				this._boundStopButtonListener = this._stopButtonListener.bind(this);
				this._stopButton.addEventListener("click", this._boundStopButtonListener); //$NON-NLS-0$
				
				this._launchConfigurationDispatcher = this._projectCommands.getLaunchConfigurationDispatcher();
				this._launchConfigurationEventTypes = ["create", "delete", "changeState", "deleteAll"]; //$NON-NLS-3$ //$NON-NLS-2$ //$NON-NLS-1$ //$NON-NLS-0$
				this._boundLaunchConfigurationListener = this._launchConfigurationListener.bind(this);
				this._launchConfigurationEventTypes.forEach(function(eventType) {
					this._launchConfigurationDispatcher.addEventListener(eventType, this._boundLaunchConfigurationListener);
				}, this);
				
				this._createLaunchConfigurationsDropdown();			
			} else {
				throw new Error("this._domNode is null"); //$NON-NLS-0$
			}
		},
		
		_createLaunchConfigurationsDropdown: function() {
			this._cachedLaunchConfigurations = {};
			
			// function which populates the launch configurations dropdown menu
			var populateFunction = function(parent) {
				if (this._menuItemsCache && this._menuItemsCache.length > 0) {
					this._menuItemsCache.forEach(function(menuItem){
						parent.appendChild(menuItem);
					});
				} else {
					this._menuItemsCache = []; // clear launch configurations menu items cache
					var dropdown = this._launchConfigurationsDropdown.getDropdown();
					var hash, launchConfiguration, menuItem;
					
					for (hash in this._cachedLaunchConfigurations) {
						if (this._cachedLaunchConfigurations.hasOwnProperty(hash)) {
							launchConfiguration = this._cachedLaunchConfigurations[hash];
							menuItem = dropdown.appendMenuItem(launchConfiguration.Name);
							
							menuItem.addEventListener("click", function(currentHash, event){ //$NON-NLS-0$
								// Use currentHash to get cached launch config again because it will 
								// be updated by the listener as events occur. Using currentHash directly 
								// instead of _getCachedCopy(launchConfiguration) here to avoid 
								// unnecessarily keeping old copies of the launchConfiguration alive.
								var cachedConfig = this._cachedLaunchConfigurations[currentHash];
								this.selectLaunchConfiguration(cachedConfig);
							}.bind(this, hash)); // passing in hash here because using it directly in function only creates a reference which ends up with the last value of hash
							
							this._menuItemsCache.push(menuItem);
						}
					}
					
					var separator = dropdown.appendSeparator();
					this._menuItemsCache.push(separator);
					
					var createNewItem = dropdown.appendMenuItem(messages["createNew"]); //$NON-NLS-0$
					this._menuItemsCache.push(createNewItem);
					
					var defaultDeployCommand = this._projectCommands.getDeployProjectCommands(this._commandRegistry)[0];
					createNewItem.addEventListener("click", function(event){ //$NON-NLS-0$
//						defaultDeployCommand.callback({});
						this._commandRegistry.runCommand(defaultDeployCommand.id, this._projectExplorer.treeRoot, this, null, null, this._launchConfigurationsWrapper); //$NON-NLS-0$
					}.bind(this));
				}
			}.bind(this);
			
			this._launchConfigurationsDropdown = new mRichDropdown.RichDropdown({
				parentNode: this._launchConfigurationsWrapper, 
				buttonName: messages["selectLaunchConfig"], //$NON-NLS-0$
				populateFunction: populateFunction
			});
			
			var triggerButton = this._launchConfigurationsDropdown.getDropdownTriggerButton();
			
			triggerButton.classList.remove("dropdownDefaultButton"); //$NON-NLS-0$
			triggerButton.classList.add("launchConfigurationsButton"); //$NON-NLS-0$
		},
		
		destroy: function() {
			this._launchConfigurationEventTypes.forEach(function(eventType) {
				this._launchConfigurationDispatcher.removeEventListener(eventType, this._boundLaunchConfigurationListener);
			}, this);
			this._playButton.removeEventListener("click", this._boundPlayButtonListener); //$NON-NLS-0$
			this._stopButton.removeEventListener("click", this._boundStopButtonListener); //$NON-NLS-0$
			
			if (this._liveUpdateBar) {
				this._liveUpdateBar.destroy();
				this._liveUpdateBar = null;
			}
		},
		
		_launchConfigurationListener: function(event) {
			var newConfig = event.newValue;
			
			if(event.type === "changeState" && newConfig){ //$NON-NLS-0$			
				// replace selected launch config if necessary
				var cachedConfig = this._getCachedCopy(newConfig);
				if (cachedConfig === this._selectedLaunchConfiguration) {
					this.selectLaunchConfiguration(newConfig);
				}
				
				// replace cached launch config
				this._putInLaunchConfigurationsCache(newConfig);
			} else {
				this._menuItemsCache = []; // clear launch configurations menu items cache
				
				if(event.type === "create" && newConfig){ //$NON-NLS-0$
					// cache new launch config
					this._putInLaunchConfigurationsCache(newConfig);
				} else if(event.type === "delete"){ //$NON-NLS-0$
					var deletedFile = event.oldValue.File;
					
					// iterate over cached launch configs, find and delete 
					// the one that matches the deleted file
					for (var hash in this._cachedLaunchConfigurations) {
						if (this._cachedLaunchConfigurations.hasOwnProperty(hash)) {
							if (this._cachedLaunchConfigurations[hash].File.Location === deletedFile.Location) {
								if (this._cachedLaunchConfigurations[hash] === this._selectedLaunchConfiguration) {
									this.selectLaunchConfiguration(null);
								}
								
								this._removeFromLaunchConfigurationsCache(this._cachedLaunchConfigurations[hash]);
								break;
							}
						}
					}
				} else if(event.type === "deleteAll"){ //$NON-NLS-0$
					this._cacheLaunchConfigurations([]);
					this.selectLaunchConfiguration(null);
				}
			}
		},
	
		selectLaunchConfiguration: function(launchConfiguration) {
			if (launchConfiguration) {
				this._launchConfigurationsDropdown.setDropdownTriggerButtonName(launchConfiguration.Name);
				this._selectedLaunchConfiguration = launchConfiguration;
				
				this._checkLaunchConfigurationStatus(launchConfiguration);
			} else {
				this._launchConfigurationsDropdown.setDropdownTriggerButtonName(messages["selectLaunchConfig"]); //$NON-NLS-0$
				this._selectedLaunchConfiguration = null;
			}
		},
		
		_checkLaunchConfigurationStatus: function(launchConfiguration) {
			// update status
			if (launchConfiguration.status) {
				if (launchConfiguration.status.error) {
					if(launchConfiguration.status.error.Retry){
						// authentication error, gather required parameters and try again
						launchConfiguration.parametersRequested = launchConfiguration.status.error.Retry.parameters;
						launchConfiguration.optionalParameters = launchConfiguration.status.error.Retry.optionalParameters;
						this._commandRegistry.runCommand("orion.launchConfiguration.checkStatus", launchConfiguration, this, null, null, this._statusLight); //$NON-NLS-0$
					} else {
						this.turnStatusLightRed();
						this._statusLight.title = launchConfiguration.status.error.Message;
					}
				} else {
					this.setStatus(launchConfiguration.status);
				}
			} else {
				// check status
				this._projectClient.getProjectDelpoyService(launchConfiguration.ServiceId, launchConfiguration.Type).then(function(service){
					if(service && service.getState){
						var progressMessage = i18nUtil.formatMessage(messages["checkingStateMessage"], launchConfiguration.Name); //$NON-NLS-0$
						this._progressService.progress(service.getState(launchConfiguration.Params), progressMessage).then(function(result){
							launchConfiguration.status = result;
							this._launchConfigurationDispatcher.dispatchEvent({type: "changeState", newValue: launchConfiguration}); //$NON-NLS-0$
						}.bind(this), function(error){
							launchConfiguration.status = {error: error};
							this._launchConfigurationDispatcher.dispatchEvent({type: "changeState", newValue: launchConfiguration}); //$NON-NLS-0$
						}.bind(this), function(error){}, function(progress){});
					}
				}.bind(this));
			}
		},
		
		setStatus: function(status) {
			switch (status.State) {
				case "PROGRESS": //$NON-NLS-0$
					break; //do nothing
				case "STARTED": //$NON-NLS-0$
					this.turnStatusLightGreen();
					break;
				case "STOPPED": //$NON-NLS-0$
					this.turnStatusLightRed();
					break;
				default:
					this.turnStatusLightOff();
					break;
			}
			this._statusLabel.title = status.Message;
			this._statusLight.title = status.Message;
		},
		
		/**
		 * Sets the list of launch configurations to be used by this run bar.
		 * This method may be called more than once. Any previously cached
		 * launch configurations will be replaced with the newly specified ones.
		 * 
		 * @param {Array} launchConfigurations An array of launch configurations
		 */
		setLaunchConfigurations: function(launchConfigurations) {
			this._menuItemsCache = []; //reset the cached launch configuration dropdown menu items
			this._cacheLaunchConfigurations(launchConfigurations);
		},
	
		_getCachedCopy: function(launchConfiguration) {
			var hash = this._getHash(launchConfiguration);
			return this._cachedLaunchConfigurations[hash];
		},
		
		_cacheLaunchConfigurations: function(launchConfigurations) {
			this._cachedLaunchConfigurations = {};
			launchConfigurations.forEach(function(launchConfig){
				this._putInLaunchConfigurationsCache(launchConfig);
			}, this);
		},
		
		_getHash: function(launchConfiguration) {
			return launchConfiguration.Name + ":" + launchConfiguration.ServiceId; //$NON-NLS-0$
		},
		
		_putInLaunchConfigurationsCache: function(launchConfiguration) {
			var hash = this._getHash(launchConfiguration);
			this._cachedLaunchConfigurations[hash] = launchConfiguration;
		},
		
		_removeFromLaunchConfigurationsCache: function(launchConfiguration) {
			var hash = this._getHash(launchConfiguration);
			delete this._cachedLaunchConfigurations[hash];
		},
	
		turnStatusLightRed: function() {
			this._statusLight.classList.add("statusLightRed"); //$NON-NLS-0$
			this._statusLight.classList.remove("statusLightGreen"); //$NON-NLS-0$
		},
	
		turnStatusLightGreen: function() {
			this._statusLight.classList.add("statusLightGreen"); //$NON-NLS-0$
			this._statusLight.classList.remove("statusLightRed"); //$NON-NLS-0$
		},
		
		turnStatusLightOff: function() {
			this._statusLight.classList.remove("statusLightGreen"); //$NON-NLS-0$
			this._statusLight.classList.remove("statusLightRed"); //$NON-NLS-0$
		},
		
		_playButtonListener: function() {
			if (this._liveUpdateBar && this._liveUpdateBar.isLiveUpdateActive()) {
				// TODO
			} else {
				this.deploySelectedLaunchConfiguration();
			}
		},
		
		deploySelectedLaunchConfiguration: function() {
			this._commandRegistry.runCommand("orion.launchConfiguration.deploy", this._selectedLaunchConfiguration, this, null, null, this._playButton); //$NON-NLS-0$
		},
		
		_stopButtonListener: function() {
			this._commandRegistry.runCommand("orion.launchConfiguration.stopApp", this._selectedLaunchConfiguration, this, null, null, this._stopButton); //$NON-NLS-0$
		},
		
		insertLiveUpdateBar: function(liveUpdateBar) {
			this._liveUpdateBar = liveUpdateBar;
			
			var separator = document.createElement("span"); //$NON-NLS-0$
			separator.classList.add("runBarSeparator"); //$NON-NLS-0$
			this._domNode.appendChild(separator);
			
			this._liveUpdateBar.setParentNode(this._domNode);
		},
		
		getLiveUpdateBar: function() {
			return this._liveUpdateBar;
		}
		
	});
	
	return {
		RunBar: RunBar
	};
});