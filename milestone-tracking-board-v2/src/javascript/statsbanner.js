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
                flex: 2,
                tooltip: "The number of user stories explicitly associated with the Milestone that are in the Accepted (or higher) ScheduleState."
            },{
                xtype: 'statsbanneraccepted',
                byCount: false,
                title: 'Accepted Points',
                unitLabel: "Points",
                flex: 2,
                tooltip: "The summed Plan Estimates of user stories (only) explicitly associated with the Milestone that are in the Accepted (or higher) ScheduleState."
            },{
                xtype: 'statsbannertestcoverage',
                title: 'Test Coverage',
                unitLabel: 'user stories',
                flex: 2,
                tooltip: "The number of user stories associated with the milestone that have at least 1 test case."
            },{
                xtype: 'statsbannertestcases',
                title: 'Test Cases Executed',
                unitLabel: 'executed',
                testCaseTypes: [],
                flex: 2,
                enableTooltip: true,
                tooltip: "The number of test cases associated with the milestone's User Story.</br></br>Passed Test cases are the number of those test cases where the Last Verdict = Passed, Last Run < Milestone Target Date and every result has an attachment.  Executed test cases are the number of those test cases that have been run and all results have an attachment, but where the Last Verdict is not Passed."
            },{
                xtype: 'statsbannertestcases',
                title: 'UAT Tests Executed',
                unitLabel: 'executed',
                testCaseTypes: [],
                flex: 2,
                enableTooltip: true,
                tooltip: 'The number of UAT test cases associated with the milestone User Stories.</br></br>Passed Test cases are the number of those test cases where the Last Verdict = Passed, Last Run < Milestone Target Date and every result has an attachment.  Executed test cases are the number of those test cases that have been run and all results have an attachment, but where the Last Verdict is not Passed.'
            },{
                xtype: 'statsbannerdefects',
                title: 'Closed Defects',
                unitLabel: ' Defects',
                flex: 2,
                tooltip: "The number of defects explicitly associated with the Milestone or associated with a User Story that is explicitly associated with the Milestone or associated with a TestCase that is associated with a User Story that is explicity associated with the Milestone that are in a Closed State."
             },{xtype: 'statsbannercollapseexpand', flex: 0}
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
        _loadTestCaseResults: function(store, records){
            if (!records || records.length === 0){
                return;
            }

            var testCases = _.filter(records, function(r){ return r.get('_type') === 'testcase'; }),
                oids = _.map(testCases, function(r){ return r.get('ObjectID'); });

            if (!oids || oids.length === 0){
                return;
            }
            var targetDate = Rally.util.DateTime.fromIsoString(this.timeboxRecord.get(this.timeboxEndDateField));
            Ext.create('Rally.technicalservices.data.ChunkerStore',{
                model: 'TestCaseResult',
                chunkOids: oids,
                chunkField: "TestCase.ObjectID",
                fetch: ['ObjectID', 'TestCase','WorkProduct','FormattedID','Attachments']
            }).load().then({
                success: function(testCaseResults){
                    _.each(testCases, function(tc){
                        var results = _.filter(testCaseResults, function(tcr){ return tcr.get('TestCase').ObjectID === tc.get('ObjectID'); }),
                            resultsWithAttachments = _.filter(results, function(r){ return r.get('Attachments') && r.get('Attachments').Count > 0; });

                        tc.set('_resultsTotal',results.length);
                        tc.set('_resultsWithAttachments',resultsWithAttachments.length);
                        tc.set('_milestoneTargetDate', targetDate)
                    });
                    store.fireEvent('datachanged');
                },
                failure: function(operation){
                    //this.logger.log('_loadAttachmentsInformation load callback', operation)
                },
                scope: this
            });
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
            var defaults = {
                flex: 1,
                context: this.context,
                store: this.store,
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
                property: 'Milestones',
                value: this.timeboxRecord.get('_ref')
            });
            filters = filters.or({
                property: 'Requirement.Milestones',
                value: this.timeboxRecord.get('_ref')
            });
            filters = filters.or({
                property: 'TestCase.WorkProduct.Milestones',
                value: this.timeboxRecord.get('_ref')
            });

            if (customFilters && customFilters.filters && customFilters.filters.length > 0  && customFilters.types &&
                (Ext.Array.contains(customFilters.types, 'hierarchicalrequirement') || Ext.Array.contains(customFilters.types, 'defect'))
            ){
                var customFilter = Rally.data.wsapi.Filter.fromQueryString(customFilters.filters.toString());
                filters = filters.and(customFilter);
            }

            return filters;
        },

        _createTestCaseStore: function(){

            var filters =  Ext.create('Rally.data.wsapi.Filter',{
                property: 'WorkProduct.Milestones',
                value: this.timeboxRecord.get('_ref')
            });

            this.testCaseStore = Ext.create('Rally.data.wsapi.Store',{
                model: 'TestCase',
                filters: filters,
                fetch: ['LastRun','LastVerdict','Attachments','Type','WorkProduct','ObjectID'],
                context: this.context.getDataContext(),
                limit: 'Infinity'
            });
        },
        _createWorkItemStore: function(customFilters){
            var filters = this._getWorkItemFilters(customFilters);

            this.store = Ext.create('Rally.data.wsapi.artifact.Store', {
                models: ['HierarchicalRequirement','Defect'],
                fetch: ['ObjectID', 'FormattedID', 'ScheduleState', 'PlanEstimate','Iteration','Name','StartDate','EndDate','State','DirectChildrenCount','TestCases','Resolution'],
                filters: filters,
                context: this.context.getDataContext(),
                limit: Infinity
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