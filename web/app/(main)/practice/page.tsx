import { Dice5 } from 'lucide-react';

export default function PracticePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      <Dice5 size={48} className="text-retro-textDim mb-4" />
      <h1 className="font-pixel text-sm text-retro-cyan retro-glow mb-3">Practice Mode</h1>
      <p className="text-retro-textDim font-retro text-lg">Coming soon. Complete the learning path first!</p>
      <div className="mt-6 font-retro text-retro-textDim/50 text-sm">
        ╔═══════════════════╗<br />
        ║&nbsp; UNDER CONSTRUCTION &nbsp;║<br />
        ╚═══════════════════╝
      </div>
    </div>
  );
}
