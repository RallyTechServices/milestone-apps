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
                byCount: false,
                title: 'Accepted Points',
                unitLabel: "Points",
                flex: 2,
                tooltip: "The summed Plan Estimates of user stories and defects explicitly associated with the Milestone and defects associated with a User Story that is explicitly associated with the Milestone that are in the Accepted (or higher) ScheduleState."
            },{
                xtype: 'statsbannerestimatedstories',
                title: "Estimated Work Items",
                unitLabel: "Work Items",
                flex: 2,
                tooltip: "The number of user stories and defects explicitly associated with the Milestone or defects associated with a User Story that is explicitly associated with the Milestone that have a plan estimate of 0 or higher."
            },{
                xtype: 'statsbanneraccepted',
                byCount: true,
                title: 'Accepted Count',
                unitLabel: "work items",
                flex: 2,
                tooltip: "The number of user stories and defects explicitly associated with the Milestone and defects associated with a User Story that is explicitly associated with the Milestone that are in the Accepted (or higher) ScheduleState."
            },{
                xtype: 'statsbannerdefects',
                title: 'Active Defects',
                unitLabel: ' Defects',
                flex: 2,
                tooltip: "The number of defects explicitly associated with the Milestone or associated with a User Story that is explicitly associated with the Milestone that are not in a Closed State."
            },{
                xtype: 'statsbannertestcases',
                title: 'Test Cases Passed',
                unitLabel: 'executed',
                flex: 2,
                tooltip: "The number of test cases associated with a User Story or Defect associated with the milestone.  Passed Test cases are the number of those test cases where the Last Verdict = Passed.  Executed test cases are the number of those test cases that have been run, but where the Last Verdict is not Passed."
            },{
                xtype: 'statsbannerdefectdensity',
                title: 'Defect Density',
                unitLabel: 'Defects/Test Cases',
                flex: 2,
                tooltip: "Defect Density =( (Total Number of Defects – Cancelled defects – Rejected Defects) / Total Number of Test Cases Executed)"
            },{
                xtype: 'statsbannermilestoneprogress',
                flex: 2
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

            var filters = this._getBannerFilters();

            this.store = Ext.create('Rally.data.wsapi.artifact.Store', {
                models: ['HierarchicalRequirement','Defect'],
                fetch: ['ObjectID', 'FormattedID', 'ScheduleState', 'PlanEstimate','Iteration','Name','StartDate','EndDate','State','DirectChildrenCount'],
                filters: filters,
                context: this.context.getDataContext(),
                limit: Infinity
            });

            //need to configure the items at the instance level, not the class level (i.e. don't use the 'defaults' config)
            this.items = this._configureItems(this.items);

            this.on('expand', this._onExpand, this);
            this.on('collapse', this._onCollapse, this);
            this.store.on('load', this._checkForLateStories, this);
            this.callParent(arguments);
            this._update();

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
                cancelledDefectStates: this.cancelledDefectStates,
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
            }
        },
        _getBannerFilters: function(){
            var filters = Ext.create('Rally.data.wsapi.Filter',{
                property: 'Milestones',
                value: this.timeboxRecord.get('_ref')
            });
            filters = filters.or({
                property: 'Requirement.Milestones',
                value: this.timeboxRecord.get('_ref')
            });

            if (this.includeFeatureUserStories){
                filters = filters.or({
                    property: this.featureName + ".Milestones",
                    value: this.timeboxRecord.get('_ref')
                });
            }

            return filters;
        }
    });
})();