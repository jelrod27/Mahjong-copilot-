import { Dice5 } from 'lucide-react';

export default function PracticePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <Dice5 size={48} className="text-gray-300 mb-4" />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Practice Mode</h1>
      <p className="text-gray-500">Coming soon. Complete the learning path first!</p>
    </div>
  );
}
