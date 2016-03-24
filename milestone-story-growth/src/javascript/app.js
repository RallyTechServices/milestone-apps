Ext.define("tagged-story-growth", {
    extend: 'Rally.app.TimeboxScopedApp',
    scopeType: 'release',
    supportsUnscheduled: false,

    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),

    config: {
        defaultSettings: {
            tagsOfInterest: []
        }
    },

    onScopeChange: function(timeboxScope){

        if (!this.doneStates){
            Rally.technicalservices.WsapiToolbox.fetchDoneStates().then({
                scope: this,
                success: function(doneStates){
                    this.doneStates = doneStates;
                    this._validateSettings();
                },
                failure: function(msg){
                    Rally.ui.notify.Notifier.showError({message: msg});
                }
            });
        } else {
            this._validateSettings();
        }
    },
    _validateSettings: function(){
        var tags = this._getTags();

        if (this.down('#display_box')){
            this.down('#display_box').destroy();
        }

        this.logger.log('_validateSettings > tags', tags);
        if (this._getTags().length > 0){
            this.add({
                xtype: 'container',
                itemId: 'display_box',
                width: '100%'
            });
            this._fetchStories(this._getTags());
        } else {
            this.add({
                xtype: 'container',
                itemId: 'display_box',
                html: 'No tags have been configured.  Please use the App Settings to configure at least one tag of interest.'
            });
        }

    },
    _getTags: function(){
        var tags = this.getSetting('tagsOfInterest') || [];
        if (!(tags instanceof Array)){
            tags = tags.split(',');
        }
        return tags;
    },
    _fetchStories: function(tags){
        var me = this,
            release_name = this.getContext().getTimeboxScope().getRecord().get('Name'),
            tag_filter_objs = [];

        _.each(tags, function(tag){
            tag_filter_objs.push({
                property: 'Tags',
                operator: '=',
                value: tag
            });
        });

        var filter_obj = {
            property: 'Release.Name',
            operator: '=',
            value: release_name
        };

        var filters = Rally.data.wsapi.Filter.or(tag_filter_objs);
        filters = filters.and(filter_obj);

        this.logger.log('_fetchStories > filters', filters.toString());
        var fetch = ['FormattedID','ObjectID','Project','CreationDate','AcceptedDate','Name'],
            model = 'HierarchicalRequirement',
            promises = [
                Rally.technicalservices.WsapiToolbox.fetchWsapiRecords({model: model, fetch: fetch, filters: [filter_obj]}),
                Rally.technicalservices.WsapiToolbox.fetchWsapiRecords({model: model, fetch: fetch, filters: filters})
            ];

        this.setLoading('Loading tagged stories...');
        Deft.Promise.all(promises).then({
            scope: this,
            success: function(results){
                this.logger.log('_fetchStories > records loaded', results[0].length, results[1].length);
                this._buildChart(results[0], results[1]);
            },
            failure: function(msg){
                Rally.ui.notify.Notifier.showError({message: msg});
            }
        }).always(function(){ me.setLoading(false);});
    },

    _buildChart: function(all_stories, tagged_stories){
        this.add({
            xtype: 'tscumulativegrowth',
            itemId: 'display_box',
            records: all_stories,
            taggedRecords: tagged_stories,
            dateFieldMapping: {
                Created: 'CreationDate',
                Accepted: 'AcceptedDate'
            },
            startDate: this.getContext().getTimeboxScope().getRecord().get('ReleaseStartDate'),
            endDate: this.getContext().getTimeboxScope().getRecord().get('ReleaseDate')
        });
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
            xtype: 'rallytagpicker',
            name: 'tagsOfInterest',
            fieldLabel: 'Tags',
            labelAlign: 'right',
            labelWidth: 150,
            width: 400,
            margin: '0 0 200 0'
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
