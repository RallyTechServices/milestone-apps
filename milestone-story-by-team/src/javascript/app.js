Ext.define("milestone-story-by-team", {
    extend: 'Rally.app.TimeboxScopedApp',
    scopeType: 'release',
    supportsUnscheduled: false,

    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    states: ['Defined','In-Progress','Completed','Accepted'],
    config: {
        defaultSettings: {
            milestonesOfInterest: []
        }
    },

    onScopeChange: function(timeboxScope){
       this._validateSettings();
    },
    _validateSettings: function(){
        var milestones = Rally.technicalservices.Toolbox.getSettingAsArray(this.getSetting('milestonesOfInterest'));

        this._updateDisplay(milestones);

    },
    _updateDisplay: function(milestones){

        //if (this.down('#display_box')){
        //    this.down('#display_box').destroy();
        //}

        this.logger.log('_validateSettings > milestones', milestones);
        if (milestones.length > 0){
            Rally.technicalservices.WsapiToolbox.fetchLeafProjectsInScope(this.getContext().getProject()._ref).then({
                scope: this,
                success: function(leaves){
                    this.add({
                        xtype: 'container',
                        itemId: 'display_box',
                        width: '95%'
                    });
                    this._fetchStories(milestones, leaves);
                },
                failure: function(msg){
                    Rally.ui.notify.Notifier.showError({message: msg});
                }
            });
        } else {
            this.add({
                xtype: 'container',
                itemId: 'display_box',
                html: 'No milestones have been configured.  Please use the App Settings to configure at least one Milestone of interest.'
            });
        }
    },
    _fetchStories: function(milestones, projects){
        var me = this,
            release_name = this.getContext().getTimeboxScope().getRecord().get('Name'),
            start_date = this.getContext().getTimeboxScope().getRecord().get('ReleaseStartDate'),
            m_filter_objs = [];

        _.each(milestones, function(ms){
            m_filter_objs.push({
                property: 'Milestones',
                operator: '=',
                value: ms
            });
        });

        var filter_obj = {
            property: 'Release.Name',
            operator: '=',
            value: release_name
        };

        var filters = Rally.data.wsapi.Filter.or(m_filter_objs);
        filters = filters.and(filter_obj);

        this.logger.log('_fetchStories > filters', filters.toString());

        var model = 'Project',
            fetch = ['ObjectID','Name']


        var fetch = ['FormattedID','ObjectID','Project','CreationDate','AcceptedDate','Name','ScheduleState'],
            model = 'HierarchicalRequirement',
            promises = [];

        promises.push(Rally.technicalservices.WsapiToolbox.fetchWsapiRecords({model: model, fetch: fetch, filters: filters}));
        _.each(projects, function(proj){
            var count_filters = [filter_obj, {
                property: 'Project.ObjectID',
                value: proj.get('ObjectID')
            }];
            promises.push(Rally.technicalservices.WsapiToolbox.fetchWsapiCount(model,count_filters));
        });

        this.setLoading('Loading stories...');
        Deft.Promise.all(promises).then({
            scope: this,
            success: function(results){
                this.logger.log('_fetchStories > records loaded',results, results[0].length, results[0], results[1].length, results[1]);
                this._buildGrid(results, projects);
            },
            failure: function(msg){
                Rally.ui.notify.Notifier.showError({message: msg});
            }
        }).always(function(){ me.setLoading(false);});

    },

    _buildGrid: function(results, projects){

        /**
         * Create a project hash
         * For each project show:
         *    # Total stories for release
         *    # Tagged stories for Release
         *    %Tagged Stories of total stories
         *    %Defined Tagged Stories
         *    %In Progress Tagged Stories
         *    %Complete Tagged Stories
         *    %Accepted
         */
        //Create Project Hash
        //For each project:

        var tagged_stories_by_project = Rally.technicalservices.Toolbox.aggregateRecordsByField(results[0], "Project", "ObjectID");

        this.logger.log('_buildGrid', tagged_stories_by_project);
        var data = [];

        var states = this.states;
        for (var i=0; i< projects.length; i++){
            var tagged_story_array = tagged_stories_by_project[projects[i].get('ObjectID')] || [];

            var tagged_stories_by_state = Rally.technicalservices.Toolbox.aggregateRecordsByField(tagged_story_array, "ScheduleState");

            var rec = {
                project: projects[i].get('Name'),
                total: results[i+1] || 0,
                tagged: tagged_story_array.length
            };
            _.each(states, function(state){
                var state_array = tagged_stories_by_state[state] || [];
                rec[state] = state_array.length;
            });
            data.push(rec);

        }

        if (this.down('#storygrid')){
            this.down('#storygrid').destroy();
        }
        this.add({
            xtype: 'rallygrid',
            itemId: 'storygrid',
            store: Ext.create('Rally.data.custom.Store',{
                data: data
            }),
            margin: 10,
            padding: 10,
            scroll: 'vertical',
            columnCfgs: this._getColumnCfgs()
        });

    },
    _getColumnCfgs: function(){
        var cols = [{
            dataIndex: 'project',
            text: 'Team',
            flex: 1,
            renderer: function(v,m,r){
                if (r.get('tagged') == 0){
                    return  '<span class="picto icon-warning ts-icon"></span>' + v ;
                }
                return '<span class="ts-icon"></span>' + v;
            }
        },{
            dataIndex: 'total',
            text: '# Stories'
        },{
            dataIndex: 'tagged',
            text: '# Milestone Stories'
        },{
            dataIndex: 'tagged',
            text: '% Milestone Stories',
            renderer: function(v,m,r){
                var total = r.get('total') || 0;
                if (v && v > 0 && total > 0){
                    return Ext.String.format('{0} %', (v/total * 100).toFixed(0));
                }
                return '0 %';
            }
        }];

        _.each(this.states, function(state){
            cols.push({
                dataIndex: state,
                text: '% ' + state,
                renderer: this._percentRenderer
            });
        }, this);
        return cols;
    },
    _percentRenderer: function(v,m,r){
        var tagged = r.get('tagged') || 0;
        if (v && v > 0 && tagged > 0){
            return Ext.String.format('{0} %', (v/tagged * 100).toFixed(0));
        }
        return '0 %';
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
    getSettingsFields: function(){
        return [{
            xtype: 'rallymilestonepicker',
            name: 'milestonesOfInterest',
            fieldLabel: 'Milestones',
            labelWidth: 150,
            width: 400
        }];
    },
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        Ext.apply(this, settings);
        this._validateSettings();
    }
});