import { TrendingUp } from 'lucide-react';

export default function ProgressPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <TrendingUp size={48} className="text-gray-300 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Progress</h1>
      <p className="text-gray-500">Coming soon. Track your learning journey.</p>
    </div>
  );
}
