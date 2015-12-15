Ext.define("milestone-metrics", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'selection_box', layout: {type: 'hbox'}, padding: 10, flex: 1},
        {xtype:'container',itemId:'display_box'}
    ],
    artifactFetch: [
        'ObjectID',
        'FormattedID',
        'Name',
        'ScheduleState',
        'Iteration',
        'Project',
        'PlannedVelocity',
        'PlanEstimate',
        'LastVerdict',
        'State',
        'Requirement',
        'WorkProduct',
        'StartDate',
        'EndDate'
    ],
    unscheduledIterationName: "Unscheduled",
    config: {
        defaultSettings: {
            closedDefectStates: ['Closed']
        }
    },

    launch: function() {
        this.fetchScheduleStates().then({
            success: function(states){
                this.scheduleStates = states;
                this._addSelectors();
            },
            failure: function(msg){
                Rally.ui.notify.Notifier.showError({message: msg});
            },
            scope: this
        });

    },
    _addSelectors: function(){
        this.down('#selection_box').removeAll();

        var filters = Ext.create('Rally.data.wsapi.Filter',{
            property: 'Projects',
            operator: 'contains',
            value: this.getContext().getProject()._ref
        });
        filters = filters.or({
            property: 'TargetProject',
            value: null
        });

        this.milestoneSelector = this.down('#selection_box').add({
            xtype: 'rallymilestonecombobox',
            stateful: true,
            stateId: this.getContext().getScopedStateId('milestone-cb'),
            width: 200,
            fieldLabel: 'Milestone',
            labelAlign: 'right',
            context: this.getContext(),
            storeConfig: {
                filters: filters,
                remoteFilter: true
            }
        });

        this.milestoneInformation = this.down('#selection_box').add({
            xtype: 'container',
            itemId: 'milestone-information',
            flex: 1
        });

        this.iterationFilter = this.down('#selection_box').add({
            xtype: 'rallyiterationcombobox',
            fieldLabel: 'Filter by Iteration',
            labelAlign: 'right',
            allowClear: true,
            width: 300,
            value: ''
        });
        this.milestoneSelector.on('change', this._update, this);
        this.iterationFilter.on('change', this._filterIteration, this);

    },
    _updateMilestoneInformation: function(){
        var recData = this.milestoneSelector.getRecord() && this.milestoneSelector.getRecord().getData();

        if (recData){
            var targetDate = recData.TargetDate,
                days = null,
                html = '<span style="color:red;">No target date set for milestone</span>';

            if (targetDate){
                days = Rally.util.DateTime.getDifference(Rally.util.DateTime.fromIsoString(targetDate),new Date(), 'day'),
                targetDate = Rally.util.DateTime.formatWithDefault(Rally.util.DateTime.fromIsoString(targetDate));

                if (days >= 0){
                    html = Ext.String.format('Target Date: {0} ({1} days remaining)', targetDate,days);
                } else {
                    html = Ext.String.format('<span style="color:red;">Target Date: {0} ({1} days past target date)</span>', targetDate, days*(-1));
                }
            }
            this.logger.log('_update', html);

            this.milestoneInformation.update(Ext.String.format('<div class="selector-msg">{0}</div>', html));
        }
    },
    _update: function(){
        this._updateMilestoneInformation();

        if (this.grid){
            this.grid.destroy();
        }
        this._fetchMilestoneArtifacts(this.milestoneSelector.getRecord().get('_ref'))
    },
    _getFilters: function(){
        var milestoneRef = this.milestoneSelector.getRecord().get('_ref'),
            iteration = this.iterationFilter.getRecord();

        this.logger.log('_getFilters', milestoneRef, iteration, iteration && iteration.get('Name'));

        var filters = Ext.create('Rally.data.wsapi.Filter',{
            property: 'Milestones',
            value: milestoneRef
        });

        filters = filters.or({
            property: 'Requirement.Milestones',
            value: milestoneRef
        });

        filters = filters.or({
            property: 'WorkProduct.Milestones',
            value: milestoneRef
        });

        this.logger.log('_getFilters', filters.toString());
        return filters;

    },
    _fetchMilestoneArtifacts: function(milestoneRef){

        var filters = this._getFilters();

        var store = Ext.create('Rally.data.wsapi.artifact.Store', {
            models: ['Defect', 'DefectSuite', 'UserStory','TestCase'],
            filters: filters,
            limit: 'Infinity',
            context: {
                project: this.getContext().getProject()._ref,
                projectScopeDown: true,
                projectScopeUp: false
            },
            fetch: this.artifactFetch
        });
        store.load({
            callback: function(records, operation){
                this.logger.log('store loaded', records, operation);
                if (operation.wasSuccessful()){
                    this._displayMilestoneMetrics(records);
                } else {
                    Rally.ui.notify.Notifier.showError({message: 'Error loading Artifacts: ' + operation.error.errors.join(',')});
                }
            },
            scope: this
        });
    },
    _filterIteration: function(cb){

        if (this.grid && this.grid.store){
            this.grid.store.clearFilter();
            if (cb.getRecord()){
                this.grid.store.filter([{
                    property: 'iteration',
                    value: cb.getRecord().get('Name')
                }]);
            }
        }

    },
    _displayMilestoneMetrics: function(records) {

        var iterationHash = this._aggregateRecordsByIteration(records);

        var data = this._mungeData(iterationHash);
        this.logger.log('_displayMilestoneMetrics',data);

        var store = Ext.create('Rally.data.custom.Store',{
            data: data,
            fields: ['iteration',
                'startDate',
                'endDate',
                'project',
                'acceptedCount',
                'totalCount',
                'plannedVelocity',
                'pctPlannedVelocity',
                'acceptedPoints',
                'pctAccepted',
                'remaining',
                'totalPoints',
                'passedTestCount',
                'testCount',
                'activeDefects',
                'totalDefects']
        });


        if (this.grid){
            this.grid.destroy();
        }

       this.grid = Ext.create('Rally.ui.grid.Grid',{
            store: store,
            columnCfgs: [
                {text: 'Iteration', dataIndex: 'iteration', flex:2, align: 'left', renderer: this._styleRenderer},
                {text: 'Start Date', dataIndex: 'startDate', flex:1, align: 'left', renderer: this._dateRenderer},
                {text: 'End Date', dataIndex: 'endDate', flex:1, align: 'left', renderer: this._dateRenderer},
                {text: 'Project', dataIndex: 'project', flex: 3, align: 'left', renderer: this._styleRenderer},
                {text: 'Total Work Item Count', flex: 1, dataIndex: 'totalCount', align: 'center', renderer: this._styleRenderer},
                {text: 'Accepted Work Item Count', flex: 1, dataIndex: 'acceptedCount', align: 'center', renderer: this._styleRenderer},
                {text: '% Accepted', flex: 1, dataIndex: 'pctAccepted', align: 'center', renderer: this._pctRenderer},
                {text: 'Accepted Points', flex: 1, dataIndex: 'acceptedPoints', align: 'center', renderer: this._styleRenderer},
                {text: 'Remaining Points', flex: 1, dataIndex: 'remaining', align: 'center', renderer: this._styleRenderer},
                {text: 'Total Points', flex: 1, dataIndex: 'totalPoints', align: 'center', renderer: this._styleRenderer},
                {text: '% Planned Velocity', flex: 1, dataIndex: 'pctPlannedVelocity', align: 'center', renderer: this._pctRenderer},
                {text: 'Passed Tests', flex: 1, dataIndex: 'passedTestCount', align: 'center', renderer: this._styleRenderer},
                {text: 'Total tests', flex: 1, dataIndex: 'testCount', align: 'center', renderer: this._styleRenderer},
                {text: 'Active Defects', flex: 1, dataIndex: 'activeDefects', align: 'center', renderer: this._styleRenderer},
                {text: 'Total Defects', flex: 1, dataIndex: 'totalDefects', align: 'center', renderer: this._styleRenderer}]
        });
        this.add(this.grid);

        if (this.iterationFilter.getValue()){
            this._filterIteration(this.iterationFilter);
        }

    },
    _styleRenderer: function(v,m,r){
        if (r.get('iteration') === 'Total'){
            m.tdCls = "summary-row";
        }
        return v;
    },
    _pctRenderer: function(v,m,r){
        if (r.get('iteration') === 'Total'){
            m.tdCls = "summary-row";
        }
        if (v >= 0){
            return (v * 100).toFixed(1) + ' %';
        }
        return '';
    },
    _dateRenderer: function(v,m,r){
        if (r.get('iteration') === 'Total'){
            m.tdCls = "summary-row";
        }
        if (v){
            return Rally.util.DateTime.formatWithDefault(Rally.util.DateTime.fromIsoString(v));
        }
        return '';
    },
    _mungeData: function(iterationHash){
        var data = [];

        _.each(iterationHash, function(records, oid){
            console.log('munge',oid, records);
            var row = this._getStatistics(records);


            row.iteration = records[0].get('Iteration').Name;
            row.project = records[0].get('Project').Name;
            row.startDate = (records[0].get('Iteration') && records[0].get('Iteration').StartDate) || '';
            row.endDate = (records[0].get('Iteration') && records[0].get('Iteration').EndDate) || '';
            row.plannedVelocity = (records[0].get('Iteration') && records[0].get('Iteration').PlannedVelocity) || '';
            row.pctPlannedVelocity = row.plannedVelocity ? row.totalPoints/row.plannedVelocity : 0;
            row.pctAccepted =  row.totalPoints > 0 ? row.acceptedPoints/row.totalPoints : 0;
            row.remaining =  row.totalPoints - row.acceptedPoints;
            data.push(row);
        }, this);

        data.push(this._getTotalRow(data));
        this.logger.log('_mungeData', data);
        return data;
    },
    _getTotalRow: function(data){
        var totalRow = {
            iteration: 'Total',
            project: '',
            startDate: '',
            endDate: '',
            plannedVelocity: 0,
            pctPlannedVelocity: 0,
            remaining: 0,
            acceptedCount: 0,
            acceptedPoints: 0,
            totalCount: 0,
            totalPoints: 0,
            totalDefects: 0,
            activeDefects: 0,
            testCount: 0,
            passedTestCount: 0,
            pctAccepted: 0
        };

        _.each(data, function(row){
            totalRow.plannedVelocity += row.plannedVelocity || 0;
            totalRow.acceptedCount += row.acceptedCount || 0;
            totalRow.acceptedPoints += row.acceptedPoints || 0;
            totalRow.totalCount += row.totalCount || 0;
            totalRow.totalPoints += row.totalPoints || 0;
            totalRow.totalDefects += row.totalDefects || 0;
            totalRow.activeDefects += row.activeDefects || 0;
            totalRow.testCount += row.testCount || 0;
            totalRow.passedTestCount += row.passedTestCount || 0;
        });
        totalRow.remaining = totalRow.totalPoints - totalRow.acceptedPoints;
        totalRow.pctAccepted = totalRow.totalPoints ? totalRow.acceptedPoints/totalRow.totalPoints : 0;
        totalRow.pctPlannedVelocity = totalRow.plannedVelocity ? totalRow.totalPoints/totalRow.plannedVelocity : 0;
        return totalRow;
    },
    _getClosedDefectStates: function(){
        this.logger.log('_getClosedDefectStates',this.getSetting('closedDefectStates'));
        var states = this.getSetting('closedDefectStates');
        if (Ext.isString(states)){
            states = states.split(',');
        }
        return states;
    },
    _getAcceptedScheduleStates: function(){
        return this.scheduleStates.slice(this.scheduleStates.indexOf('Accepted'));
    },
    _getPassedTestValues: function(){
        return ['Passed'];
    },
    _getStatistics: function(records){
        var acceptedStates = this._getAcceptedScheduleStates(),
            closedDefectStates = this._getClosedDefectStates(),
            passedValues = this._getPassedTestValues(),
            acceptedCount = 0,
            acceptedPoints = 0,
            totalPoints = 0,
            totalDefects = 0,
            activeDefects = 0,
            testCount = 0,
            passedTestCount = 0,
            totalCount = 0;

        _.each(records, function(r){
            if (r.get('ScheduleState') && Ext.Array.contains(acceptedStates, r.get('ScheduleState'))){
                acceptedCount++;
                acceptedPoints += r.get('PlanEstimate') || 0;
            }
            totalPoints += r.get('PlanEstimate') || 0;
            totalCount++;

            if (r.get('_type') === 'defect'){
                totalDefects++;
                if (!Ext.Array.contains(closedDefectStates, r.get('State'))){
                    activeDefects ++;
                }
            }

            if (r.get('_type') === 'testcase'){
                testCount++;
                if (Ext.Array.contains(passedValues, r.get('LastVerdict'))){
                    passedTestCount++;
                }
            }
        });

        return {
            acceptedCount: acceptedCount,
            acceptedPoints: acceptedPoints,
            totalCount: totalCount,
            totalPoints: totalPoints,
            totalDefects: totalDefects,
            activeDefects: activeDefects,
            testCount: testCount,
            passedTestCount: passedTestCount
        };
    },

    _aggregateRecordsByIteration: function(records){
        var hash = {};
        _.each(records, function(r){
            var val = r.get('Iteration');

            if (val){
                val = val.ObjectID;
            } else {
                val = r.get('Requirement') || r.get('WorkProduct');
                if (val){
                    val = val.Iteration && val.Iteration.ObjectID || null;
                }
            }
            if (val){
                this.logger.log('_aggregate', val, r);
                if (val === null){
                    val = "Unscheduled";
                }
                if (!hash[val]){
                    hash[val] = [];
                }
                hash[val].push(r);

            }
                    }, this);
        return hash;
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
    getSettingsFields: function(){
        return Rally.technicalservices.Settings.getFields();
    },
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        Ext.apply(this, settings);
        this._addSelectors();
    },
    fetchScheduleStates: function(){
        var deferred = Ext.create('Deft.Deferred');
        Rally.data.ModelFactory.getModel({
            type: 'HierarchicalRequirement',
            success: function(model) {
                var field = model.getField('ScheduleState');
                field.getAllowedValueStore().load({
                    callback: function(records, operation, success) {
                        if (success){
                            var values = [];
                            for (var i=0; i < records.length ; i++){
                                values.push(records[i].get('StringValue'));
                            }
                            deferred.resolve(values);
                        } else {
                            deferred.reject('Error loading ScheduleState values for User Story:  ' + operation.error.errors.join(','));
                        }
                    },
                    scope: this
                });
            },
            failure: function() {
                var error = "Could not load schedule states";
                deferred.reject(error);
            }
        });
        return deferred.promise;
    }
});
