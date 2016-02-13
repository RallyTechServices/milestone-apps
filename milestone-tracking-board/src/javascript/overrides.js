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