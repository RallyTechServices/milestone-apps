(function() {
    var Ext = window.Ext4 || window.Ext;

    /**
     * Allows user to see stats for a timebox in a horizontal bar format
     */
    Ext.define('MilestoneTrackingApp.StatsBanner', {
        extend: 'Ext.container.Container',
        alias:'widget.statsbanner',
        mixins: [
            'Rally.Messageable',
            'Rally.clientmetrics.ClientMetricsRecordable'
        ],
        cls: 'stats-banner',
        layout: 'hbox',
        border: 0,
        width: '100%',
        stateful: true,
        stateEvents: ['expand', 'collapse'],
        filters: [],
        firstPortfolioItemName: 'Feature',

        config: {
            context: null,
            expanded: true,

        },

        items: [
            {
                xtype: 'statsbanneraccepted',
                byCount: true,
                title: 'Accepted User Stories',
                unitLabel: "User Stories",
                uniqueid: 'accepted-user-stories',
                expanded: this.expanded,
                flex: 2,
                tooltip: "<b>Accepted User Stories</b><p>Number of Accepted (or in the higher ScheduledState) User Stories that are explicitly associated with this Milestone.</p>"
            },{
                xtype: 'statsbanneraccepted',
                byCount: false,
                title: 'Accepted Points',
                unitLabel: "Points",
                expanded: this.expanded,
                uniqueid: 'accepted-points-user-stories',
                flex: 2,
                tooltip: "<b>Accepted Points</b> <p>Sum of Story Points tied to the Accepted (or in the higher ScheduledState) User Stories that are explicitly associated with this Milestone.</p>"
            },{
                xtype: 'statsbannertestcoverage',
                title: 'Test Coverage',
                unitLabel: 'user stories',
                expanded: this.expanded,
                flex: 2,
                tooltip: "<b>Test Case Coverage</b> <p>Number of User Stories associated with this Milestone, linked to atleast one test case.</p>"
            },{
                xtype: 'statsbannertestcases',
                title: 'Test Cases Executed',
                unitLabel: 'executed',
                expanded: this.expanded,
                testCaseTypes: [],
                flex: 2,
                enableTooltip: true,
                tooltip: "<b>Test Cases Executed:</b> <p>Test Cases to be considered executed should satisfy all the below:<br/>" +
                            "<ol><li>Every Test Case Result has a 'Verdict' (outcome)</li>" +
                            "<li>Test Case Result date is less than or equal to the Milestone Target Date</li>" +
                            "<li>Every Test Case result has an attachment</li>" +
                            "<li>Test Case belongs to an User Story that is associated with this Milestone.</li>" +
                            "</ol></p>"
            },{
                xtype: 'statsbannertestcases',
                title: 'UAT Tests Executed',
                unitLabel: 'executed',
                testCaseTypes: [],
                flex: 2,
                enableTooltip: true,
                tooltip: "<b>UAT Tests Executed</b> <p>Test Cases to be considered executed should satisfy all the below:<br/>" +
                "<ol><li>Test Type for the Test Case is 'User Acceptance Testing'</li>" +
                "<li>Every Test Case Result has a 'Verdict' (outcome)</li>" +
                "<li>Test Case Result date is less than or equal to the Milestone Target Date</li>" +
                "<li>Every Test Case result has an attachment</li>" +
                "<li>Test Case belongs to an User Story that is associated with this Milestone.</li>" +
                "</ol></p>"
            },{
                xtype: 'statsbannerdefects',
                title: 'Closed Defects',
                unitLabel: ' Defects',
                expanded: this.expanded,
                flex: 2,
                tooltip: "<b>Closed Defects</b> <p>Defects in Closed State that satisfy one of the following<br/>" +
                    "<ol><li>Defect is explicitly associated with this Milestone</li>" +
                "<li>Associated with an User Story that is explicitly associated with this Milestone</li>" +
                "<li>Associated with a TestCase that is associated with an User Story that is explicity associated with this Milestone</li>" +
                "</ol></p>"
            },{
              xtype: 'statsbannercollapseexpand',
              expanded: this.expanded
            }
        ],

        constructor: function(config) {
            this.callParent(arguments);
        },

        initComponent: function() {
            this.addEvents(
                /**
                 * @event
                 * Fires when expand is clicked
                 */
                'expand',
                /**
                 * @event
                 * Fires when collapse is clicked
                 */
                'collapse'
            );

            this.subscribe(this, Rally.Message.objectDestroy, this._update, this);
            this.subscribe(this, Rally.Message.objectCreate, this._update, this);
            this.subscribe(this, Rally.Message.objectUpdate, this._update, this);
            this.subscribe(this, Rally.Message.bulkUpdate, this._update, this);

            this._createWorkItemStore(this.customFilters);
            this._createTestCaseStore();


            //need to configure the items at the instance level, not the class level (i.e. don't use the 'defaults' config)
            this.items[4].testCaseTypes = this.uatTestCaseType;
            this.items = this._configureItems(this.items);

            this.on('expand', this._onExpand, this);
            this.on('collapse', this._onCollapse, this);
            this.store.on('load', this._checkForLateStories, this);
            this.testCaseStore.on('load', this._loadTestCaseResults, this);

            this.callParent(arguments);
            this._update();

        },
        addTestCaseResults: function(testCaseResults){
            this.testCaseResults = testCaseResults;
        },
        _loadTestCaseResults: function(store, testCases){
            if (!testCases || testCases.length === 0){
                return;
            }

            var targetDate = Rally.util.DateTime.fromIsoString(this.timeboxRecord.get(this.timeboxEndDateField)),
                testcaseResults = this.testCaseResults || null;

            if (testcaseResults){
                _.each(testCases, function(tc){
                    var results = _.filter(testcaseResults, function(tcr){ return tcr.get('TestCase').ObjectID === tc.get('ObjectID'); }),
                        resultsWithAttachments = _.filter(results, function(r){ return r.get('Attachments') && r.get('Attachments').Count > 0; });

                    tc.set('_resultsTotal',results.length);
                    tc.set('_resultsWithAttachments',resultsWithAttachments.length);
                    tc.set('_milestoneTargetDate', targetDate)
                });
                store.fireEvent('datachanged');

            } else {
                // var filters =  Rally.data.wsapi.Filter.or([{
                //     property: 'TestCase.Milestones.ObjectID',
                //     value:  this.timeboxRecord.get('ObjectID')
                // },{
                //     property: 'TestCase.WorkProduct.Milestones.ObjectID',
                //     value:  this.timeboxRecord.get('ObjectID')
                // }]);

                var filters = Ext.Array.map(testCases, function(tc){
                   return {
                      property: 'TestCase.ObjectID',
                      value: tc.get('ObjectID')
                   };
                });

                if (filters.length > 1){
                  filters = Rally.data.wsapi.Filter.or(filters);
                }

                if (filters.length === 0){
                  return;
                }

                Rally.technicalservices.Utilities.fetchWsapiRecords('TestCaseResult',filters,['ObjectID', 'TestCase','WorkProduct','FormattedID','Attachments']).then({
                    success: function(testcaseResults){
                         _.each(testCases, function(tc){
                            var results = _.filter(testcaseResults, function(tcr){ return tcr.get('TestCase').ObjectID === tc.get('ObjectID'); }),
                                resultsWithAttachments = _.filter(results, function(r){ return r.get('Attachments') && r.get('Attachments').Count > 0; });

                            tc.set('_resultsTotal',results.length);
                            tc.set('_resultsWithAttachments',resultsWithAttachments.length);
                            tc.set('_milestoneTargetDate', targetDate)
                        });
                        store.fireEvent('datachanged');
                    },
                    failure: function(msg){
                        Rally.ui.notify.Notifier.showError({message: "Error loading Test Case Result Information:  " + msg});
                    },
                    scope: this
                });
            }
        },
        _checkForLateStories: function(store){
            var lateStories = [],
                targetDate = Rally.util.DateTime.fromIsoString(this.timeboxRecord.get(this.timeboxEndDateField));

            _.each(this.store.getRange(), function(record){
                var iteration = record.get('Iteration'),
                    children = record.get('DirectChildrenCount') || 0;
                if (children === 0){
                    if (iteration){
                        if (Rally.util.DateTime.fromIsoString(iteration.EndDate) > targetDate){
                            lateStories.push(record);
                        }
                    } else {
                        lateStories.push(record);
                    }
                }

            }, this);
            if (lateStories.length > 0){
                this.fireEvent('latestoriesfound', lateStories);
            }
        },
        onRender: function() {
            if (this.expanded) {
                this.removeCls('collapsed');
            } else {
                this.addCls('collapsed');
            }
            this._setExpandedOnChildItems();
            this.callParent(arguments);
        },

        applyState: function (state) {
            if (Ext.isDefined(state.expanded)) {
                this.setExpanded(state.expanded);
            }
            this._setExpandedOnChildItems();
        },

        getState: function(){
            return {
                expanded: this.expanded
            };
        },

        _setExpandedOnChildItems: function() {
            _.each(this.items.getRange(), function(item) {
                item.setExpanded(this.expanded);
            }, this);
        },

        _getItemDefaults: function() {
            return {
                flex: 1,
                context: this.context,
                store: this.store,
                listeners: {
                    ready: this._onReady,
                    scope: this
                }
            };
        },

        _onReady: function() {
            this._readyCount = (this._readyCount || 0) + 1;
            if(this._readyCount === this.items.getCount()) {
                this.recordComponentReady();
                delete this._readyCount;
            }
        },

        _onCollapse: function() {
            this.addCls('collapsed');
            this.setExpanded(false);

            _.invoke(this.items.getRange(), 'collapse');
        },

        _onExpand: function() {
            this.removeCls('collapsed');
            this.setExpanded(true);

            _.invoke(this.items.getRange(), 'expand');
        },

        _hasTimebox: function() {
            return true;
        },

        _configureItems: function(items) {
            var idx = 0;
            var defaults = {
                flex: 1,
                context: this.context,
                store: this.store,
                uniqueid: this.uniqueid || 'id-' + idx++,
                timeboxRecord: this.timeboxRecord,
                timeboxEndDateField: this.timeboxEndDateField,
                scheduleStates: this.scheduleStates,
                closedDefectStates: this.closedDefectStates,
                resolvedDefectValues: this.resolvedDefectValues,
                testCaseStore: this.testCaseStore,
                listeners: {
                    ready: this._onReady,
                    scope: this
                }
            };

            return _.map(items, function(item) {
                return _.defaults(_.cloneDeep(item), defaults);
            });
        },

        _update: function () {
            if(this._hasTimebox()) {
                this.store.load();
                this.testCaseStore.load();
            }
        },
        _getWorkItemFilters: function(customFilters){
            var filters = Ext.create('Rally.data.wsapi.Filter',{
                property: 'Milestones.ObjectID',
                value: this.timeboxRecord.get('ObjectID')
            });
            filters = filters.or({
                property: 'Requirement.Milestones.ObjectID',
                value: this.timeboxRecord.get('ObjectID')
            });
            filters = filters.or({
                property: 'TestCase.WorkProduct.Milestones.ObjectID',
                value: this.timeboxRecord.get('ObjectID')
            });
            filters = filters.or({
                property: 'WorkProduct.Milestones.ObjectID',
                value: this.timeboxRecord.get('ObjectID')
            });

            if (customFilters && customFilters.filters && customFilters.filters.length > 0  && customFilters.types &&
                (Ext.Array.contains(customFilters.types, 'hierarchicalrequirement') || Ext.Array.contains(customFilters.types, 'defect'))
            ){
                var customFilter = Rally.data.wsapi.Filter.fromQueryString(customFilters.filters.toString());
                filters = filters.and(customFilter);
            }

            return filters;
        },
        _createTestCaseResultStore: function(){

            var filters =  Rally.data.wsapi.Filter.or([{
                property: 'TestCase.Milestones.ObjectID',
           //     operator: 'contains',
                value:  this.timeboxRecord.get('ObjectID')
            },{
                property: 'TestCase.WorkProduct.Milestones.ObjectID',
           //     operator: 'contains',
                value:  this.timeboxRecord.get('ObjectID')
            }]);

            this.testCaseResultStore = Ext.create('Rally.data.wsapi.Store',{
                model: 'TestCaseResult',
                filters: filters,
                fetch: ['ObjectID', 'TestCase','WorkProduct','FormattedID','Attachments'],
                //context: this.context.getDataContext(),
                context: {project: null},
                pageSize: 1000,
                limit: 'Infinity'
            });
        },

        _createTestCaseStore: function(){

            var filters =  Ext.create('Rally.data.wsapi.Filter',{
                property: 'WorkProduct.Milestones.ObjectID',
                value: this.timeboxRecord.get('ObjectID')
            });

            filters = filters.or({
                property: 'Milestones.ObjectID',
                value: this.timeboxRecord.get('ObjectID')
            });

            this.testCaseStore = Ext.create('Rally.data.wsapi.Store',{
                model: 'TestCase',
                filters: filters,
                fetch: ['LastRun','LastVerdict','Attachments','Type','WorkProduct','ObjectID'],
                //context: this.context.getDataContext(),
                context: {project: null},
                pageSize: 2000,
                limit: 'Infinity'
            });
        },
        _createWorkItemStore: function(customFilters){
            var filters = this._getWorkItemFilters(customFilters);

            this.store = Ext.create('Rally.data.wsapi.artifact.Store', {
                models: ['HierarchicalRequirement','Defect'],
                fetch: ['ObjectID', 'FormattedID', 'ScheduleState', 'PlanEstimate','Iteration','Name','StartDate','EndDate','State','DirectChildrenCount','TestCases','Resolution'],
                filters: filters,
                pageSize: 1000,
                //context: this.context.getDataContext(),
                context: {project: null},
                limit: 'Infinity'
            });
        },
        updateFilters: function(customFilters){
            this.store = null;
            this._createWorkItemStore(customFilters);
            _.each(this.items.items, function(item) {
                if (item.updateStore) { item.updateStore(this.store); }
            }, this);
            this.store.load();
        }
    });
})();
