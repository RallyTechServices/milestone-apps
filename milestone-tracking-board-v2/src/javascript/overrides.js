/**
 * This needs to be overridden for the _getLeafCount function to workaround what I think is a bug in the API.
 */
var origGetPrototypeBody = Ext.data.NodeInterface.getPrototypeBody;

Ext.override(Rally.ui.grid.data.NodeInterface, {
    extend: 'Ext.data.NodeInterface',

    statics: Ext.apply(Ext.data.NodeInterface.prototype.self, {

        /**
         * @private
         * @property
         */
        noLayoutFields: /^(expanded|loaded|loading|leaf|leafCount)$/,

        getPrototypeBody: function() {
            var protoBody = origGetPrototypeBody(),
                originalDestroy = protoBody.destroy,
                originalReplaceChild = protoBody.replaceChild,
                originalOnChildNodesAvailable = protoBody.onChildNodesAvailable;

            return Ext.apply(protoBody, {
                save: function (options) {
                    options = options || {};
                    options.params = options.params || {};
                    options.params.fetch = options.params.fetch || true;

                    var store = this.store && this.store.treeStore || this.store;
                    if (store && _.isFunction(store.getParentFetch) && _.isFunction(store.getChildFetch)) {
                        var fetchOptions = {
                            node: this,
                            fetch: options.params.fetch
                        };
                        options.params.fetch = this.getDepth() === 1 ?
                            store.getParentFetch(fetchOptions) : store.getChildFetch(fetchOptions);
                    }

                    return this.self.superclass.save.apply(this, [options]);
                },

                set: function (name, value) {
                    var isInTree = Rally.ui.grid.data.NodeInterface.noLayoutFields.test(name) &&  this.store && this.store.ownerTree,
                        tree = this.store && this.store.ownerTree,
                        ret;

                    if (isInTree) {
                        tree.suspendLayouts();
                    }

                    ret = this.callParent(arguments);

                    if (isInTree) {
                        tree.resumeLayouts();
                    }

                    return ret;
                },

                destroy: function(silent) {
                    if (this.parentNode) {
                        this.parentNode.decrementLeafCount();
                    }
                    this._removeChildren();

                    return originalDestroy.apply(this, [silent]);
                },

                replaceChild: function(newChild, oldChild) {
                    oldChild.replacedByNode = newChild;
                    return originalReplaceChild.apply(this, [newChild, oldChild]);
                },

                onChildNodesAvailable: function(records, recursive, callback, scope) {
                    if (!this._isVisible()) {
                        // childNodes came back after expand,
                        // but user has scrolled and this node (the parent) has moved out of the view.
                        // cancel expand
                        var view = this._getView();
                        if (view) {
                            view.fireEvent('afternonvisibleitemexpand', this);
                            return;
                        }
                    }

                    return originalOnChildNodesAvailable.apply(this, arguments);
                },

                updateCollectionCount: function(collectionName, count) {
                    var collection = this.get(collectionName);

                    if (collection) {
                        collection.Count = count;
                    }

                    this.set('dirtyCollection', true);
                },

                incrementLeafCount: function() {
                    this.set('leafCount', (this.get('leafCount') || 0) + 1);
                    this.set('leaf', false);
                },

                decrementLeafCount: function() {
                    this.set('leafCount', (this.get('leafCount') || 1) - 1);

                    if (this.get('leafCount') > 1) {
                        this.set('leaf', true);
                    }
                },

                resetLeafCount: function(enableHierarchy, expandedCollectionNames) {
                    if (enableHierarchy) {
                        var leafCount = this._getLeafCount(expandedCollectionNames);
                        this.set('leaf', leafCount < 1);
                        this.set('leafCount', leafCount);
                    } else {
                        this.set('leaf', true);
                        this.set('leafCount', 0);
                    }
                },

                _isVisible: function() {
                    var store = this.store;

                    if (store && _.isFunction(store.isRootNode)) {
                        return store.isRootNode(this) || this._getViewNode();
                    }

                    return true;
                },

                _getView: function() {
                    var grid = this.store && this.store.ownerTree;

                    return grid && grid.getView();
                },

                _getViewNode: function() {
                    var view = this._getView();

                    return view && view.getNode(this);
                },

                _getLeafCount: function(expandedCollectionNames) {
                    var typePath = this.get('_type').toLowerCase(),
                        collectionNames = Ext.Array.from(expandedCollectionNames[typePath] || []);

                    var count =  _.reduce(collectionNames, function(accumulator, collectionName) {
                        var collectionVal = this.get(collectionName);
                        if (collectionVal && collectionVal.Count) {
                            accumulator += collectionVal.Count;
                        }

                        return accumulator;
                    }, 0, this);

                    if (count === 0 && this.get('DirectChildrenCount') > 0){
                        return this.get('DirectChildrenCount');
                    }
                    return count;
                },

                _removeChildren: function() {
                    this.suspendEvents(false);
                    _.each(_.clone(this.childNodes), function(node) {
                        node.parentNode.decrementLeafCount();
                        node.parentNode.removeChild(node, false);
                    });
                    this.resumeEvents();
                }
            });
        }
    })
});

Ext.define('Rally.ui.renderer.template.AttachmentTemplate', {
    extend: 'Ext.XTemplate',

    /**
     * @cfg {String}
     * the field name to get the value for
     */
    fieldName: '',

    constructor: function(config) {

        var templateConfig = [
            '{[values["' + config.fieldName + '"].Count]}',
            config
        ];

        if (config.fieldName === 'Attachments'){
           return this.callParent(['<tpl>',
               '<div aria-label="{[this._getTooltipText(values)]}" title="{[this._getTooltipText(values)]}">',
               '<span class="discussion-cnt">{[this._getColumnText(values)]}</span>',
               '</div>',
               '</tpl>']);
        }
        return this.callParent(templateConfig);
    },
    _getTooltipText: function(recordData){

        var attachments = recordData["Attachments"] && recordData["Attachments"].Count || 0,
            resultsWithAttachments = recordData["resultsWithAttachments"] || 0,
            resultsTotal = recordData["resultsTotal"] || 0,
            showAttachments = recordData["_showAttachments"];

        if (showAttachments){
            return Ext.String.format("There are {0} Attachments on the TestCase.  {1} of {2} TestCaseResults have attachments.",
                attachments, resultsWithAttachments, resultsTotal);

        } else {
            return "";
        }
    },
    _getColumnText: function(recordData){
        var resultsWithAttachments = recordData["resultsWithAttachments"] || 0,
            resultsTotal = recordData["resultsTotal"] || 0,
            showAttachments = recordData["_showAttachments"];

        if (showAttachments){
            return Ext.String.format("{0}/{1}", resultsWithAttachments, resultsTotal);
        }
        return recordData.Attachments && recordData.Attachments.Count || 0;
    }
});

Ext.define('Rally.ui.renderer.template.LastVerdictTemplate', {
    extend: 'Ext.XTemplate',

    /**
     * @cfg {String}
     * the field name to get the value for
     */
    fieldName: '',

    constructor: function(config) {
        Ext.QuickTips.init();
        var templateConfig = [
            '{[this._getLastVerdict(values)]}',
            config
        ];
        return this.callParent(templateConfig);
    },
    _getLastVerdict: function(recordData){
       var warnings = [];

        if (recordData.resultsTotal !== recordData.resultsWithAttachments){
           warnings.push("<li>Not all Test Case Results have Attachments.");
       }

       if (recordData.LastRun > recordData._milestoneTargetDate){
           warnings.push("<li>Last Verdict ran after Milestone Target Date.");
       }

       var lastVerdict = recordData.LastVerdict;
       if (warnings.length > 0){
           var qtip = recordData.FormattedID + " not executed because:<br/><br/>" + warnings.join('<br/>');
           lastVerdict += '<div class="picto icon-warning warning" data-qtip="' + qtip + '" style="color:#FAD200;font-size:16px;margin:10px"></div>';
       }

       return lastVerdict;
   }
});


Ext.override(Rally.ui.renderer.RendererFactory,{
    typeFieldTemplates: {
        testcase: {
            attachments: function(field){
                return Ext.create('Rally.ui.renderer.template.AttachmentTemplate',{
                    fieldName: field.name
                });
            },
            lastverdict: function(field){
                return Ext.create('Rally.ui.renderer.template.LastVerdictTemplate',{
                    fieldName: field.name
                });
            }
        },
        milestone: {
            formattedid: function(field) {
                var renderIdAsText = true;
                var context = Rally.environment.getContext();
                if (context) {
                    var featureEnabledFnName = 'is' + 'FeatureEnabled';
                    if (_.isFunction(context[featureEnabledFnName]) && context[featureEnabledFnName]('EDP_MILESTONE_BETA')) {
                        renderIdAsText = false;
                    }
                }
                return Ext.create('Rally.ui.renderer.template.FormattedIDTemplate', {
                    renderIdAsText: renderIdAsText
                });
            }
        },
        task: {
            state: function(field) {
                return Ext.create('Rally.ui.renderer.template.ScheduleStateTemplate', {
                    field: field,
                    showTrigger: true
                });
            }
        }
    }
});

Ext.override(Rally.ui.combobox.FieldValueComboBox,{

    _loadStoreValues: function() {
            this.field.getAllowedValueStore().load({
                requester: this,
                callback: function (records, operation, success) {
                    var store = this.store;
                    if (!store) {
                        return;
                    }
                    var noEntryValues = [],
                        labelValues = _.map(
                            _.filter(records, this._hasStringValue),
                            this._convertAllowedValueToLabelValuePair,
                            this
                        );

                    if (this.field.getType() === 'boolean') {
                        labelValues = labelValues.concat([
                            this._convertToLabelValuePair('Yes', true),
                            this._convertToLabelValuePair('No', false)
                        ]);
                    } else if (this.field.required === false) {
                        var name = "-- No Entry --",
                            value = "";
                        if (this.getUseNullForNoEntryValue()) {
                            value = null;
                        }
                        if (this.field.attributeDefinition.AttributeType.toLowerCase() === 'rating') {
                            name = this.getRatingNoEntryString();
                            value = "None";
                        }
                        noEntryValues.push(this._convertToLabelValuePair(name, value));
                    }

                    store.loadRawData(noEntryValues.concat(labelValues));
                    store.fireEvent('load', store, store.getRange(), success);
                    this.onReady();
                },
                scope: this
            });
    }
});

Ext.override(Rally.ui.grid.FieldColumnFactory, {
        _blackListedFields: {
            task: [
//                'Attachments',
                'BuildDefinitions',
                'Changesets',
                'ObjectID',
                'ObjectUUID',
                'RevisionHistory',
                'SchemaVersion',
                'Subscription',
                'TaskIndex',
                'VersionId',
                'Workspace'
            ],

            defaultBlackList: [
                'Actuals',
  //              'Attachments',
                'Blocker',
                'BuildDefinitions',
                'Changesets',
                'Children',
                'ClosedDefectCount',
                'Editors',
                'GrossEstimateConversionRatio',
                'Iterations',
                'LastResult',
                'LandingPage',
                'ObjectID',
                'ObjectUUID',
                'PassingTestCaseCount',
                'PortfolioItem',
                'Predecessors',
                'Releases',
                'RevisionHistory',
                'ScheduleStatePrefix',
                'SchemaVersion',
                'ShortDisplayName',
                'Subscription',
                'Successors',
                'TaskIndex',
                'TeamMembers',
                'TeamMemberships',
                'TestCaseCount',
                'TotalDefectCount',
                'UserIterationCapacities',
                'UserPermissions',
                'UserProfile',
                'VersionId',
                'Workspace'
            ]
        }

    });
