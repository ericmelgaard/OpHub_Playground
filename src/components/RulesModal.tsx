import React, { useState } from 'react';
import { X, Plus, Wand2, Check, AlertCircle, ChevronRight } from 'lucide-react';
import { Rule } from '../types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface RulesModalProps {
  show: boolean;
  onClose: () => void;
  rules: Rule[];
  onEditRule: (rule: Rule) => void;
  onCreateRule: () => void;
}

export function RulesModal({
  show,
  onClose,
  rules,
  onEditRule,
  onCreateRule,
}: RulesModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (!show) return null;

  const filteredRules = rules.filter(rule => 
    rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rule.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full h-full md:h-[90vh] md:max-w-4xl md:rounded-lg flex flex-col bg-white dark:bg-gray-800">
        <CardHeader className="flex-shrink-0 p-6 border-b dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Manage Rules
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateRule}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Rule
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="mt-4">
            <Input
              type="text"
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {filteredRules.length === 0 && searchQuery && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No rules match your search
                </p>
              </div>
            )}

            {filteredRules.length === 0 && !searchQuery && (
              <div className="text-center py-8">
                <Wand2 className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No rules have been created yet
                </p>
                <Button
                  variant="outline"
                  onClick={onCreateRule}
                  className="inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create First Rule
                </Button>
              </div>
            )}

            {filteredRules.map((rule) => (
              <Card
                key={rule.id}
                className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                onClick={() => onEditRule(rule)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wand2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {rule.name}
                        </h4>
                        {rule.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {rule.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={rule.active ? 'success' : 'secondary'}
                        className="flex-shrink-0"
                      >
                        {rule.active ? 'Active' : 'Inactive'}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}