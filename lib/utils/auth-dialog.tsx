import { createRoot } from 'react-dom/client';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface AuthDialogProps {
    title: string;
    text: string;
    icon: 'error' | 'warning' | 'info';
    onClose: () => void;
}

function AuthDialog({ title, text, icon, onClose }: AuthDialogProps) {
    const iconMap = {
        error: <AlertCircle className="w-6 h-6 text-red-600" />,
        warning: <AlertTriangle className="w-6 h-6 text-orange-600" />,
        info: <Info className="w-6 h-6 text-blue-600" />
    };

    const bgColorMap = {
        error: 'bg-red-100',
        warning: 'bg-orange-100',
        info: 'bg-blue-100'
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="fixed inset-0 bg-black/80" />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start gap-4 mb-4">
                    <div className={`p-2 rounded-full ${bgColorMap[icon]} flex-shrink-0`}>
                        {iconMap[icon]}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                        <p className="text-sm text-gray-600">{text}</p>
                    </div>
                </div>
                <div className="flex justify-end mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
}

export async function showAuthDialog(
    title: string,
    text: string,
    icon: 'error' | 'warning' | 'info' = 'warning'
): Promise<void> {
    return new Promise((resolve) => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const root = createRoot(container);

        const handleClose = () => {
            root.unmount();
            document.body.removeChild(container);
            resolve();
        };

        root.render(<AuthDialog title={title} text={text} icon={icon} onClose={handleClose} />);
    });
}

