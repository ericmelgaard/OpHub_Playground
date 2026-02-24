import React, { useState, useEffect } from 'react';
import { X, GripVertical, ChevronUp, ChevronDown, EyeOff, Eye, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { QuickActionType } from './QuickActionBar';

interface QuickActionConfig {
  id: QuickActionType;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  bgColor: string;
  iconColor: string;
  visible: boolean;
  order: number;
}

interface CustomizeQuickActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  actions: QuickActionConfig[];
  onSave: (actions: QuickActionConfig[]) => void;
}

export function CustomizeQuickActionsModal({
  isOpen,
  onClose,
  actions: initialActions,
  onSave,
}: CustomizeQuickActionsModalProps) {
  const [actions, setActions] = useState<QuickActionConfig[]>(initialActions);

  useEffect(() => {
    setActions(initialActions);
  }, [initialActions]);

  if (!isOpen) return null;

  const visibleActions = actions.filter(a => a.visible).sort((a, b) => a.order - b.order);
  const hiddenActions = actions.filter(a => !a.visible);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(visibleActions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedActions = actions.map(action => {
      const newIndex = items.findIndex(item => item.id === action.id);
      if (newIndex !== -1) {
        return { ...action, order: newIndex, visible: true };
      }
      return action;
    });

    setActions(updatedActions);
  };

  const moveUp = (actionId: QuickActionType) => {
    const index = visibleActions.findIndex(a => a.id === actionId);
    if (index <= 0) return;

    const items = Array.from(visibleActions);
    [items[index - 1], items[index]] = [items[index], items[index - 1]];

    const updatedActions = actions.map(action => {
      const newIndex = items.findIndex(item => item.id === action.id);
      if (newIndex !== -1) {
        return { ...action, order: newIndex };
      }
      return action;
    });

    setActions(updatedActions);
  };

  const moveDown = (actionId: QuickActionType) => {
    const index = visibleActions.findIndex(a => a.id === actionId);
    if (index === -1 || index >= visibleActions.length - 1) return;

    const items = Array.from(visibleActions);
    [items[index], items[index + 1]] = [items[index + 1], items[index]];

    const updatedActions = actions.map(action => {
      const newIndex = items.findIndex(item => item.id === action.id);
      if (newIndex !== -1) {
        return { ...action, order: newIndex };
      }
      return action;
    });

    setActions(updatedActions);
  };

  const toggleVisibility = (actionId: QuickActionType) => {
    const action = actions.find(a => a.id === actionId);
    if (!action) return;

    const updatedActions = actions.map(a => {
      if (a.id === actionId) {
        return { ...a, visible: !a.visible };
      }
      return a;
    });

    setActions(updatedActions);
  };

  const handleSave = () => {
    onSave(actions);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 dark:bg-gray-950 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-700 dark:border-gray-800">
          <div>
            <h2 className="text-2xl font-semibold text-white">Customize Quick Actions</h2>
            <p className="text-sm text-gray-400 mt-1">Show, hide, and reorder your quick action cards</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-gray-800 dark:hover:bg-gray-900"
          >
            <X className="h-5 w-5 text-gray-400" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">
              Visible Actions ({visibleActions.length})
            </h3>
            <span className="text-sm text-gray-400">Drag to reorder or use arrows</span>
          </div>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="visible-actions">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3 mb-8"
                >
                  {visibleActions.map((action, index) => (
                    <Draggable key={action.id} draggableId={action.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`bg-gray-800 dark:bg-gray-900 border border-gray-700 dark:border-gray-800 rounded-lg p-4 transition-all ${
                            snapshot.isDragging ? 'shadow-lg ring-2 ring-[rgb(0,173,240)]' : ''
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing"
                            >
                              <GripVertical className="h-5 w-5 text-gray-500" />
                            </div>

                            <div
                              className="flex items-center justify-center w-12 h-12 rounded-lg"
                              style={{ backgroundColor: action.bgColor }}
                            >
                              {React.createElement(action.icon, { className: `h-6 w-6 ${action.iconColor}` })}
                            </div>

                            <div className="flex-1">
                              <h4 className="font-medium text-white">{action.name}</h4>
                              <p className="text-sm text-gray-400">{action.description}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => moveUp(action.id)}
                                disabled={index === 0}
                                className="hover:bg-gray-700 disabled:opacity-30"
                              >
                                <ChevronUp className="h-5 w-5 text-gray-400" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => moveDown(action.id)}
                                disabled={index === visibleActions.length - 1}
                                className="hover:bg-gray-700 disabled:opacity-30"
                              >
                                <ChevronDown className="h-5 w-5 text-gray-400" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleVisibility(action.id)}
                                className="hover:bg-gray-700"
                              >
                                <EyeOff className="h-5 w-5 text-gray-400" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {hiddenActions.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">
                  Hidden Actions ({hiddenActions.length})
                </h3>
                <span className="text-sm text-gray-400">Tap to show</span>
              </div>

              <div className="space-y-3 border-2 border-dashed border-gray-700 dark:border-gray-800 rounded-lg p-4">
                {hiddenActions.map((action) => (
                  <div
                    key={action.id}
                    className="bg-gray-800/50 dark:bg-gray-900/50 border border-gray-700 dark:border-gray-800 rounded-lg p-4 opacity-60"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="flex items-center justify-center w-12 h-12 rounded-lg"
                        style={{ backgroundColor: action.bgColor }}
                      >
                        {React.createElement(action.icon, { className: `h-6 w-6 ${action.iconColor}` })}
                      </div>

                      <div className="flex-1">
                        <h4 className="font-medium text-white">{action.name}</h4>
                        <p className="text-sm text-gray-400">{action.description}</p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleVisibility(action.id)}
                        className="hover:bg-gray-700"
                      >
                        <Eye className="h-5 w-5 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-700 dark:border-gray-800">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 text-white rounded-lg hover:bg-[rgb(0,153,220)] transition-colors"
            style={{ backgroundColor: 'rgb(0, 173, 240)' }}
          >
            <Save className="h-5 w-5" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
