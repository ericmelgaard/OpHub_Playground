import { UserRole } from '../lib/supabase';
import { User, Settings, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface RoleSelectionProps {
  onSelectRole: (role: UserRole) => void;
}

export default function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  const roles = [
    {
      id: 'creator' as UserRole,
      title: 'Creator',
      description: 'Create and manage menu content',
      icon: User,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      id: 'operator' as UserRole,
      title: 'Operator',
      description: 'Operate and monitor devices',
      icon: Settings,
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      id: 'admin' as UserRole,
      title: 'Admin',
      description: 'Full system administration',
      icon: Shield,
      color: 'bg-purple-500 hover:bg-purple-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Welcome to Menu Management
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Select your role to continue
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card
                key={role.id}
                className="relative overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1"
                onClick={() => onSelectRole(role.id)}
              >
                <div className="p-8">
                  <div className={`w-16 h-16 rounded-full ${role.color} flex items-center justify-center mb-6 transition-colors`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                    {role.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    {role.description}
                  </p>
                  <Button className="w-full" variant="outline">
                    Select {role.title}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
