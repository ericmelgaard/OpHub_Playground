import { User } from '@supabase/supabase-js';
import { LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';

interface AdminDashboardProps {
  onBack: () => void;
  user: User;
}

export default function AdminDashboard({ onBack, user }: AdminDashboardProps) {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    onBack();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Admin Dashboard
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
            Full system administration and configuration
          </p>
          <div className="inline-block p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
            <p className="text-slate-600 dark:text-slate-400">
              Logged in as: <span className="font-semibold">{user.email}</span>
            </p>
          </div>
        </div>

        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              User Management
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Manage users, roles, and permissions
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              System Configuration
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Configure global system settings
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Analytics
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              View system-wide analytics and reports
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Database Management
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Manage database and data migrations
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Audit Logs
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Review system activity and audit trails
            </p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Integrations
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Manage third-party integrations
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
