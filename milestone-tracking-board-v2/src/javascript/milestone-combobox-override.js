(function() {
    var Ext = window.Ext4 || window.Ext;

    /**
     * A ComboBox for choosing a milestone
     *
     *     @example
     *     Ext.create('Ext.Container', {
     *         items: [{
     *             xtype: 'rallymilestonecombobox'
     *          }],
     *          renderTo: Ext.getBody().dom
     *     });
     */
    Ext.define('Rally.ui.combobox.MilestoneComboBox', {
        extend: 'Rally.ui.combobox.ComboBox',
        alias: 'widget.rallymilestonecombobox',
        requires: [
            'Rally.util.DateTime',
            'Rally.data.util.Sorter'
        ],

        mixins: [
            'Rally.ui.MilestoneListHeadings'
        ],

        config: {
            allowNoEntry: false,
            hideLabel: true,
            width: 300,
            storeConfig: {
                autoLoad: true,
                model: Ext.identityFn('milestone'),
                remoteFilter: false,
                remoteSort: false,
                limit: Infinity
            },
            listConfig: {
                minWidth: 385,
                cls: 'milestone-list',
                emptyText: 'No Milestones Defined'
            },
            tpl: Ext.create('Ext.XTemplate',
                '<tpl for=".">',
                '<div class="' + Ext.baseCSSPrefix + 'boundlist-item">' +
                '<div class="milestone-name"><b>{[values.FormattedID]}</b>:  {[values._refObjectName]}</div>',
                '<div class="milestone-date">{[Rally.util.DateTime.formatWithDefault(values.TargetDate)]}</div>',
                '<div class="milestone-raw-date">{[values.TargetDate]}</div>',
                '</div>',
                '</tpl>'
            )
        },

        initComponent: function () {
            this.storeConfig.sorters = [{
                sorterFn: Rally.data.util.Sorter.getDefaultSortFn('Milestone')
            }];

            this.callParent(arguments);
        },

        createPicker: function() {
            var picker = this.callParent(arguments);

            picker.on({
                show: this._addListHeaders,
                refresh: this._addListHeaders,
                scope: this,
                filterSelectedNodes: false
            });

            return picker;
        }
    });
})();