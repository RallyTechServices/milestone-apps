(function () {
    var Ext = window.Ext4 || window.Ext;

    /**
     * Iteration Tracking Board App
     * The Iteration Tracking Board can be used to visualize and manage your User Stories and Defects within an Iteration.
     */
    Ext.define('technical-services-MilestoneTrackingApp', {
        extend: 'Rally.app.App',
        componentCls: 'iterationtrackingboard',
        logger: new Rally.technicalservices.Logger(),
        settingsScope: 'project',
        //autoScroll: false,

        config: {
            defaultSettings: {
                ignoreProjectScoping: true,
                closedDefectStates: ['Closed'],
                resolvedDefectValues: [],
                displayTestCaseResultAttachments: true
            }
        },
        items: [
            {xtype:'container',itemId:'selection_box', layout: {type: 'hbox'}, padding: 10},
            {xtype:'container',itemId:'banner_box'},
            {xtype:'container',itemId:'grid_box'}
        ],

        integrationHeaders : {
                name : "ts-MilestoneTrackingApp"
        },

        sModelNames: [],

        launch: function(){

            if(!this.rendered) {
                this.on('afterrender', this.launch, this, {single: true});
                return;
            }

            Rally.data.ModelFactory.getModel({
                type: 'Defect',
                success: function(defectModel) {
                    console.log('getmodel',this);
                    var promises = [
                        Rally.technicalservices.Utilities.fetchScheduleStates(),
                        Rally.technicalservices.Utilities.fetchPortfolioTypes(),
                        Rally.technicalservices.Utilities.fetchAllowedValues(defectModel,'State'),
                        Rally.technicalservices.Utilities.fetchAllowedValues(defectModel,'Resolution')
                    ];

                    Deft.Promise.all(promises).then({
                        scope: this,
                        success: function(results){
                            this.logger.log('results',results);
                            this.sModelNames = Ext.Array.from(_.first(results[1]).get('TypePath'));
                            this.scheduleStates = results[0];
                            this.defectStates = results[2];
                            this.defectResolutions = results[3];

                            this._addComponents();
                        },
                        failure: function(msg){
                            Rally.ui.notify.Notifier.showError({message: msg});
                        }
                    });
                },
                scope: this
            });
        },
        _addComponents: function(){

            var filters = Ext.create('Rally.data.wsapi.Filter',{
                property: 'Projects',
                operator: 'contains',
                value: this.getContext().getProject()._ref
            });
            filters = filters.or({
                property: 'TargetProject',
                value: null
            });

            this.logger.log('filters', filters.toString());
            var cb = this.down('#selection_box').add({
                xtype: 'rallymilestonecombobox',
                stateful: true,
                stateId: this.getContext().getScopedStateId('milestone-cb'),
                emptyText: 'Select a Milestone...',
                storeConfig: {
                    filters: filters,
                    remoteFilter: true
                }
            });
            cb.on('change', this._update, this);

            var tpl = new Ext.XTemplate('<div class="selector-msg"><tpl if="days &gt;= 0">Target Date: {targetDate} ({days} days remaining)',
                '<tpl elseif="days &lt; 0">Target Date: {targetDate} <span style="color:red;">({days*(-1)} days past)</span>',
                '<tpl else><span style="color:red;">No target date set for milestone</span></tpl></div>');

            this.down('#selection_box').add({
                xtype: 'container',
                itemId: 'remaining-days',
                flex: 1,
                tpl: tpl
            });

            var lt_tpl = new Ext.XTemplate('<tpl if="latestories &gt; 0"><div class="picto icon-warning warning" style="color:#FAD200;font-size:16px;"></div>',
                '<div class="latestories">{latestories} Late Stories</div></tpl>')

            this.down('#selection_box').add({
                xtype: 'container',
                itemId: 'late-stories',
                flex: 1,
                style: {
                    textAlign: 'right',
                    cursor: 'pointer'
                },
                tpl: lt_tpl,
                listeners: {
                    scope: this,
                    afterrender: function(cmp){
                        cmp.getEl().on('click', this._showLateStoriesPopover, this);
                    }
                }
            });
        },

        _showLateStoriesPopover: function(event, target){
            this.logger.log('_showLateStoriesPopover',  target);

            if (this.lateStories && this.lateStories.length > 0){

                var html = _.map(this.lateStories, function(s){ return Ext.String.format('<li>{0}: {1} ({2})', s.get('FormattedID'), s.get('Name'), s.get('Iteration') && s.get('Iteration').Name || "Unscheduled")});
                html = Ext.String.format('<ul>{0}</ul>',html);

                html += "<br/><i>Late Stories are work items that are scheduled into an iteration that ends after the Milestone target date or items that are not scheduled into an iteration.</i>" ;

                var tt = Ext.create('Rally.ui.tooltip.ToolTip', {
                    target : target,
                    html: html,
                    destroyAfterHide: true
                });
                tt.show();
            }
        },
        _update: function(){

            this.down('#banner_box').removeAll();
            this.down('#grid_box').removeAll();
            if (this.down('rallygridboard')){
                this.down('rallygridboard').destroy();
            }

            var rec = this._getTimeBoxRecord();
            if (rec){
                var targetDate = Rally.util.DateTime.fromIsoString(rec.get('TargetDate')),
                    days = Rally.util.DateTime.getDifference(targetDate,new Date(), 'day'),
                    formattedTargetDate = Rally.util.DateTime.formatWithDefault(targetDate);
                this.down('#remaining-days').update({days: days, targetDate: formattedTargetDate});
            }

            this._getGridStore().then({
                success: this._addGridBoard,
                scope: this
            });
        },
        _getModelNames: function () {
            this.logger.log('_getModelNames',this.sModelNames);
            return this.sModelNames.concat(['HierarchicalRequirement','Defect']);
        },

        getSettingsFields: function () {
            var settings = this.getSettings(),
                states = this.defectStates || [],
                defectResolutions = this.defectResolutions || [],
                fields = this.callParent(arguments),
                labelWidth = 200,
                width= 600;

            this.logger.log('getSettingsFields', states, defectResolutions, settings);

            var closedStates = settings && settings.closedDefectStates;
            if (closedStates && Ext.isString(closedStates)){
                closedStates = closedStates.split(',');
            }
            var stateOptions = _.map(states, function(s){
                var checked = Ext.Array.contains(closedStates, s);
                console.log('stat',s,checked);
                return { boxLabel: s, name: 'closedDefectStates', inputValue: s, checked: checked };
            });

            var resolvedValues = settings && settings.resolvedDefectValues;
            if (resolvedValues && Ext.isString(resolvedValues)){
                resolvedValues = resolvedValues.split(',');
            }
            var resolvedOptions = _.map(defectResolutions, function(r){
                var checked = Ext.Array.contains(resolvedValues, r);
                return { boxLabel: r, name: 'resolvedDefectValues', inputValue: r, checked: checked };
            });

            fields.push({
                xtype: 'checkboxgroup',
                fieldLabel: 'Closed Defect States',
                labelWidth: labelWidth,
                width: width,
                labelAlign: 'right',
                columns: 2,
                vertical: true,
                margin: '15 0 15 0',
                items: stateOptions
            });

            fields.push({
                xtype: 'checkboxgroup',
                fieldLabel: 'Include Defects with Resolution',
                labelWidth: labelWidth,
                width: width,
                labelAlign: 'right',
                columns: 2,
                vertical: true,
                margin: '15 0 15 0',
                items: resolvedOptions
            });

            fields.push({
                name: 'displayTestCaseResultAttachments',
                xtype: 'rallycheckboxfield',
                labelWidth: labelWidth,
                labelAlign: 'right',
                label: 'Show TestCaseResult Attachments'
            });
            
            return fields;
        },
        _getFilters: function(){
            var filters = [];
            if (this._getTimeBoxRecord()){
                filters = Rally.data.wsapi.Filter({
                    property: "Milestones",
                    value: this._getMilestoneRef()
                });
            }
            return filters;
        },
        _getMilestoneRef: function(){
            var rec = this._getTimeBoxRecord();
            if (rec){
                return rec.get('_ref');
            }
            return null;
        },
        _getTimeBoxRecord: function(){
            if (this.down('rallymilestonecombobox') && this.down('rallymilestonecombobox').getRecord()){
                return this.down('rallymilestonecombobox').getRecord();
            }
            return null;
        },
        _getGridStore: function() {
            var config = {
                    models: this._getModelNames(),
                    autoLoad: false,
                    remoteSort: true,
                    pageSize: 200,
                    limit: 'Infinity',
                    root: {expanded: true},
                    enableHierarchy: true
                };

            //config.filters = this._getFilters();
            return Ext.create('Rally.data.wsapi.TreeStoreBuilder').build(config).then({
                success: function (store) {
                    store.on('load', this._loadAttachmentInformation, this);
                    return store;
                },
                scope: this
            });
        },
        _loadAttachmentInformation: function(store, node, records){
            this.logger.log('_loadAttachmentInformation', store , records);
            var displayTestCaseResultAttachments = this.getSetting('displayTestCaseResultAttachments') === 'true' ||
                this.getSetting('displayTestCaseResultAttachments') === true,
                milestoneTargetDate = this._getTimeBoxRecord().get('TargetDate');

            if (!records || records.length === 0 ){
                return;
            }

            var testCases = _.filter(records, function(r){ return r.get('_type') === 'testcase'; }),
                oids = _.map(testCases, function(r){ return r.get('ObjectID'); });

            this.logger.log('_loadAttachmentInformation test case oids', oids);

            if (!oids || oids.length === 0){
                return;
            }

            this.setLoading(true);
            Ext.create('Rally.technicalservices.data.ChunkerStore',{
                model: 'TestCaseResult',
                chunkOids: oids,
                chunkField: "TestCase.ObjectID",
                fetch: ['ObjectID', 'TestCase','WorkProduct','FormattedID','Attachments']
            }).load().then({
                success: function(testCaseResults){
                    this.logger.log('_loadAttachmentsInformation load callback', testCaseResults);
                    _.each(testCases, function(tc){
                        var results = _.filter(testCaseResults, function(tcr){ return tcr.get('TestCase').ObjectID === tc.get('ObjectID'); }),
                            resultsWithAttachments = _.filter(results, function(r){ return r.get('Attachments') && r.get('Attachments').Count > 0; });
                        tc.set('_showAttachments',displayTestCaseResultAttachments);
                        tc.set('resultsTotal',results.length);
                        tc.set('resultsWithAttachments',resultsWithAttachments.length);
                        tc.set('_milestoneTargetDate', milestoneTargetDate);
                    });
                    this.setLoading(false);
                },
                failure: function(operation){
                    this.setLoading(false);
                    this.logger.log('_loadAttachmentsInformation load callback', operation)
                },
                scope: this
            });
        },
        _updateLateStories: function(latestories){
            this.logger.log('_updateLateStories', latestories);
            this.down('#late-stories').update({latestories: latestories.length});
            this.lateStories = latestories;
        },
        _addStatsBanner: function(customFilters) {

            this.remove('statsBanner');
            this.down('#banner_box').add({
                xtype: 'statsbanner',
                itemId: 'statsBanner',
                //storeConfig: this._getStoreConfigs(),
                scheduleStates: this.scheduleStates,
                context: this.getContext(),
                timeboxRecord: this._getTimeBoxRecord(),
                timeboxEndDateField: 'TargetDate',
                filters: this._getFilters(),
                customFilters: customFilters,
                closedDefectStates: this.getSetting('closedDefectStates'),
                resolvedDefectValues: this.getSetting('resolvedDefectValues'),
                margin: '0 0 5px 0',
                listeners: {
                    resize: this._resizeGridBoardToFillSpace,
                    scope: this,
                    latestoriesfound: this._updateLateStories
                }
            });
        },

        _addGridBoard: function (gridStore) {
            var context = this.getContext();
            this.logger.log('_addGridboard');
            this.gridboard = this.add({
                itemId: 'gridBoard',
                xtype: 'rallygridboard',
                stateId: 'portfoliotracking-gridboard',
                context: context,
                plugins: this._getGridBoardPlugins(),
                modelNames: this._getModelNames(),
                gridConfig: this._getGridConfig(gridStore),
                storeConfig: {
                    filters: this._getFilters()
                },
                addNewPluginConfig: {
                    style: {
                        'float': 'left',
                        'margin-right': '5px'
                    }
                },
                listeners: {
                    load: this._onLoad,
                    afterrender : function() {
                        this.setWidth(this.getWidth()+1);
                    },
                    scope: this
                },
                height: Math.max(this.getAvailableGridBoardHeight()-50, 150)
            });
        },

        /**
         * @private
         */
        getAvailableGridBoardHeight: function() {
            var height = this.getHeight();
            if(this.down('#statsBanner') && this.down('#statsBanner').rendered) {
                height -= this.down('#statsBanner').getHeight();
            }
            return height;
        },

        _getGridBoardPlugins: function() {
            var plugins = ['rallygridboardaddnew'],
                context = this.getContext();

            var alwaysSelectedValues = ['FormattedID', 'Name', 'Owner'];
            if (context.getWorkspace().WorkspaceConfiguration.DragDropRankingEnabled) {
                alwaysSelectedValues.push('DragAndDropRank');
            }

            plugins.push({
                ptype: 'rallygridboardfilterinfo',
                isGloballyScoped: Ext.isEmpty(this.getSetting('project')),
                stateId: 'iteration-tracking-owner-filter-' + this.getAppId()
            });

            plugins.push({
                ptype: 'rallygridboardfieldpicker',
                headerPosition: 'left',
                gridFieldBlackList: [
                    'ObjectID',
                    'Description',
                    'DisplayColor',
                    'Notes',
                    'Subscription',
                    'Workspace',
                    'Changesets',
                    'RevisionHistory',
                    'Children'
                ],
                boardFieldBlackList: [
                    'ObjectID',
                    'Description',
                    'DisplayColor',
                    'Notes',
                    'Rank',
                    'DragAndDropRank',
                    'Subscription',
                    'Workspace',
                    'Changesets',
                    'RevisionHistory',
                    'PortfolioItemType',
                    'StateChangedDate',
                    'Children'
                ],
                alwaysSelectedValues: alwaysSelectedValues,
                modelNames: this.modelNames,
                boardFieldDefaults: (this.getSetting('cardFields') && this.getSetting('cardFields').split(',')) ||
                ['Parent', 'Tasks', 'Defects', 'Discussion', 'PlanEstimate', 'Iteration']
            });

            plugins.push({
                ptype: 'rallygridboardcustomfiltercontrol',
                filterControlConfig: {
                    modelNames: this._getModelNames(),
                    stateful: true,
                    stateId: context.getScopedStateId('tracking-filters')
                },
                showOwnerFilter: true,
                ownerFilterControlConfig: {
                    stateful: true,
                    stateId: context.getScopedStateId('tracking-owner-filter')
                }
            });

            plugins.push({
                ptype: 'rallygridboardactionsmenu',
                menuItems: [
                    {
                        text: 'Export...',
                        handler: function() {
                            window.location = Rally.ui.grid.GridCsvExport.buildCsvExportUrl(
                                this.down('rallygridboard').getGridOrBoard());
                        },
                        scope: this
                    }
                ],
                buttonConfig: {
                    iconCls: 'icon-export'
                }
            });

            return plugins;
        },

        setHeight: Ext.Function.createBuffered(function() {
            this.superclass.setHeight.apply(this, arguments);
            this._resizeGridBoardToFillSpace();
        }, 100),

        _resizeGridBoardToFillSpace: function() {
            if(this.gridboard) {
                this.gridboard.setHeight(this.getAvailableGridBoardHeight());
            }
        },

        _getCustomViewConfig: function() {
            var customViewConfig = {
                ptype: 'rallygridboardcustomview',
                stateId: 'iteration-tracking-board-app',

                defaultGridViews: [{
                    model: ['UserStory', 'Defect', 'DefectSuite'],
                    name: 'Defect Status',
                    state: {
                        cmpState: {
                            expandAfterApply: true,
                            columns: [
                                'Name',
                                'State',
                                'Discussion',
                                'Priority',
                                'Severity',
                                'FoundIn',
                                'FixedIn',
                                'Owner'
                            ]
                        },
                        filterState: {
                            filter: {
                                defectstatusview: {
                                    isActiveFilter: false,
                                    itemId: 'defectstatusview',
                                    queryString: '((Defects.ObjectID != null) OR (Priority != null))'
                                }
                            }
                        }
                    }
                }, {
                    model: ['UserStory', 'Defect', 'TestSet', 'DefectSuite'],
                    name: 'Task Status',
                    state: {
                        cmpState: {
                            expandAfterApply: true,
                            columns: [
                                'Name',
                                'State',
                                'PlanEstimate',
                                'TaskEstimate',
                                'ToDo',
                                'Discussions',
                                'Owner'
                            ]
                        },
                        filterState: {
                            filter: {
                                taskstatusview: {
                                    isActiveFilter: false,
                                    itemId: 'taskstatusview',
                                    queryString: '(Tasks.ObjectID != null)'
                                }
                            }
                        }
                    }
                }, {
                    model: ['UserStory', 'Defect', 'TestSet'],
                    name: 'Test Status',
                    state: {
                        cmpState: {
                            expandAfterApply: true,
                            columns: [
                                'Name',
                                'State',
                                'Discussions',
                                'LastVerdict',
                                'LastBuild',
                                'LastRun',
                                'ActiveDefects',
                                'Priority',
                                'Owner'
                            ]
                        },
                        filterState: {
                            filter: {
                                teststatusview: {
                                    isActiveFilter: false,
                                    itemId: 'teststatusview',
                                    queryString: '(TestCases.ObjectID != null)'
                                }
                            }
                        }
                    }
                }]
            };

            customViewConfig.defaultBoardViews = _.cloneDeep(customViewConfig.defaultGridViews);
            _.each(customViewConfig.defaultBoardViews, function(view) {
                delete view.state.cmpState;
            });

            return customViewConfig;
        },

        _createOwnerFilterItem: function (context) {
            var isPillPickerEnabled = context.isFeatureEnabled('BETA_TRACKING_EXPERIENCE'),
                projectRef = context.getProjectRef();

            if (isPillPickerEnabled) {
                return {
                    xtype: 'rallyownerpillfilter',
                    margin: '-15 0 5 0',
                    filterChildren: this.getContext().isFeatureEnabled('S58650_ALLOW_WSAPI_TRAVERSAL_FILTER_FOR_MULTIPLE_TYPES'),
                    project: projectRef,
                    showPills: false,
                    showClear: true
                };
            } else {
                return {
                    xtype: 'rallyownerfilter',
                    margin: '5 0 5 0',
                    filterChildren: this.getContext().isFeatureEnabled('S58650_ALLOW_WSAPI_TRAVERSAL_FILTER_FOR_MULTIPLE_TYPES'),
                    project: projectRef
                };
            }

        },

        _createTagFilterItem: function (context) {
            var filterUiImprovementsToggleEnabled = context.isFeatureEnabled('BETA_TRACKING_EXPERIENCE');
            return {
                xtype: 'rallytagpillfilter',
                margin: filterUiImprovementsToggleEnabled ? '-15 0 5 0' : '5 0 5 0',
                showPills: filterUiImprovementsToggleEnabled,
                showClear: filterUiImprovementsToggleEnabled,
                remoteFilter: filterUiImprovementsToggleEnabled
            };
        },

        _createModelFilterItem: function (context) {
            return {
                xtype: 'rallymodelfilter',
                models: this.modelNames,
                context: context
            };
        },

        _getGridConfig: function (gridStore) {
            var context = this.getContext(),
                stateString = 'release-tracking',
                stateId = context.getScopedStateId(stateString);

            var gridConfig = {
                store: gridStore,
                columnCfgs: ['Name'], //must set this to null to offset default behaviors in the gridboard
                defaultColumnCfgs: this._getGridColumns(),
                plugins: [],
                stateId: stateId,
                stateful: true,
                showPagingToolbar: true
            };
            return gridConfig;
        },

        _getSummaryColumnConfig: function () {
            var taskUnitName = this.getContext().getWorkspace().WorkspaceConfiguration.TaskUnitName,
                planEstimateUnitName = this.getContext().getWorkspace().WorkspaceConfiguration.IterationEstimateUnitName;

            return [
                {
                    field: 'AcceptedLeafStoryCount',
                    type: 'sum',
                    units: 'Total'
                },
                {
                    field: 'AcceptedLeafStoryPlanEstimateTotal',
                    type: 'sum',
                    units: planEstimateUnitName
                },
                {
                    field: 'LeafStoryCount',
                    type: 'sum',
                    units: 'Total'
                },
                {
                    field: 'LeafStoryPlanEstimateTotal',
                    type: 'sum',
                    units: planEstimateUnitName
                },
                {
                    field: 'UnEstimatedLeafStoryCount',
                    type: 'sum',
                    units: 'Total'
                }
            ];
        },

        _getGridColumns: function (columns) {
            var result = ['FormattedID', 'Name', 'PercentDoneByStoryPlanEstimate', 'PreliminaryEstimate', 'ScheduleState', 'PlanEstimate', 'Blocked', 'Iteration', 'Owner', 'Discussion'];

            if (columns) {
                result = columns;
            }
            _.pull(result, 'FormattedID');

            return result;
        },

        _onLoad: function (grid) {
            this.logger.log('_onLoad');
            var store = grid.getGridOrBoard().getStore(),
                re = new RegExp("portfolioitem/","i");

            store.each(function(record){
              if (re.test(record.get('_type')) && !record.get('UserStories') && record.get('DirectChildrenCount') > 0){
                 //todo: Fix this!!!!
                 this.logger.log('_onLoad Feature with missing children', record.get('FormattedID'), record);
              }
            },this);

            this.logger.log('_onLoad Update Stats Banner', store.filters, grid.currentCustomFilter);
            if (this.down('statsbanner')){
                this.logger.log('_onLoad Update Stats Banner filters', store.filters, grid.currentCustomFilter);

                this.down('statsbanner').updateFilters(grid.currentCustomFilter)
            } else {
                this._addStatsBanner(grid.currentCustomFilter);
            }
        },

        _onBoardFilter: function () {
            this.setLoading(true);
        },

        _onBoardFilterComplete: function () {
            this.setLoading(false);
        },

        getOptions: function() {
            return [
                {
                    text: 'About...',
                    handler: this._launchInfo,
                    scope: this
                }
            ];
        },

        _launchInfo: function() {
            if ( this.about_dialog ) { this.about_dialog.destroy(); }
            this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{
                informationHtml:  "<br/>"
            });
        },

        isExternal: function(){
            return typeof(this.getAppId()) == 'undefined';
        },
        onSettingsUpdate: function(settings){
            this.down('#selection_box').removeAll();
            this.down('#banner_box').removeAll();
            this.down('#grid_box').removeAll();
            if (this.down('rallygridboard')){
                this.down('rallygridboard').destroy();
            }
            this._addComponents();
        }
    });
})();