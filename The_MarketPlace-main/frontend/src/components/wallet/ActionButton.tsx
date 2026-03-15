interface ActionButtonProps {
  label: string;
  onClick: () => void;
}

export default function ActionButton({ label, onClick }: ActionButtonProps) {
  return (
    <button onClick={onClick} className="bg-black text-white rounded-lg py-2 hover:opacity-80 transition-opacity">
      {label}
    </button>
  );
}
