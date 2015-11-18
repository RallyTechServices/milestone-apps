Ext.define("milestone-metrics", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    items: [
        {xtype:'container',itemId:'selection_box', layout: {type: 'hbox'}, padding: 10},
        {xtype:'container',itemId:'display_box'}
    ],
    
    launch: function() {
        this.milestoneSelector = this.down('#selection_box').add({
            xtype: 'rallymilestonecombobox',
            stateful: true,
            stateId: this.getContext().getScopedStateId('milestone-cb')
        });
        this.milestoneSelector.on('change', this._update, this);
    },
    _update: function(){
        this.logger.log('_update', this.milestoneSelector.getRecord());

        this._fetchMilestoneArtifacts(this.milestoneSelector.getRecord().get('_ref'))
    },
    _fetchMilestoneArtifacts: function(milestoneRef){

        var filters = Ext.create('Rally.data.wsapi.Filter',{
            property: 'Milestones',
            value: milestoneRef
        });
        filters = filters.and({
            property: 'Iteration',
            operator: '!=',
            value: ""
        });
        //filters = filters.or({
        //    property: 'WorkProduct.Milestones',
        //    value: milestoneRef
        //});
        //filters = filters.or({
        //    property: 'Requirement.Milestones',
        //    value: milestoneRef
        //});

        var store = Ext.create('Rally.data.wsapi.artifact.Store', {
            models: ['Defect', 'DefectSuite', 'UserStory','TestCase'],
            filters: filters,
            limit: 'Infinity',
            fetch: ['ObjectID','FormattedID','Name', 'ScheduleState', 'Iteration','Project','PlannedVelocity','PlanEstimate','LastVerdict','State','Requirement','WorkProduct']
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
    _displayMilestoneMetrics: function(records) {

        var iterationHash = this._aggregateRecordsByIteration(records);

        var data = this._mungeData(iterationHash);
        this.logger.log('_displayMilestoneMetrics',data);
        var store = Ext.create('Rally.data.custom.Store',{
            data: data,
            fields: ['iteration',
                'project',
                'acceptedCount',
                'totalCount',
                'plannedVelocity',
                'acceptedPoints',
                'pctAccepted',
                'remaining',
                'passedTestCount',
                'testCount',
                'activeDefects',
                'totalDefects']
        });

        var grid = Ext.create('Rally.ui.grid.Grid',{
            store: store,
            columnCfgs: [
                {text: 'Iteration', dataIndex: 'iteration'},
                {text: 'Project', dataIndex: 'project'},
                {text: 'Work Products Accepted', dataIndex: 'acceptedCount'},
                {text: 'Scheduled', dataIndex: 'totalCount'},
                {text: 'PlannedVelocity', dataIndex: 'plannedVelocity'},
                {text: 'Accepted', dataIndex: 'acceptedPoints'},
                {text: '% Accepted', dataIndex: 'pctAccepted'},
                {text: 'Remaining', dataIndex: 'remaining'},
                {text: 'Passed Tests', dataIndex: 'passedTestCount'},
                {text: 'Total tests', dataIndex: 'testCount'},
                {text: 'Active Defects', dataIndex: 'activeDefects'},
                {text: 'Total Defects', dataIndex: 'totalDefects'}]
        });
        this.add(grid);

    },
    _mungeData: function(iterationHash){
        var data = [];
        _.each(iterationHash, function(records, oid){
            console.log('munge',oid, records);
            var row = this._getStatistics(records);

            row.iteration = records[0].get('Iteration').Name;
            row.project = records[0].get('Project').Name;
            row.plannedVelocity = records[0].get('Iteration').PlannedVelocity;
            row.pctAccepted =  row.totalPoints > 0 ? row.acceptedPoints/row.totalPoints : 0;
            row.remaining =  row.totalPoints - row.acceptedPoints;
            data.push(row);
        }, this);
        this.logger.log('_mungeData', data);
        return data;
    },
    _getStatistics: function(records){
        var acceptedStates = ['Accepted'],
            closedDefectStates = ['Closed'],
            passedValues = ['Passed'],
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
            this.logger.log('_aggregate', val, r);
            if (val === null){
                val = "Unscheduled";
            }
            if (!hash[val]){
                hash[val] = [];
            }
            hash[val].push(r);
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
        this.launch();
    }
});
