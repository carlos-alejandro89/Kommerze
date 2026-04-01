import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import logo from '@/assets/Softi.png';
import heavyMachineryImg from '@/assets/login-home.jpg';
import { ServiceGetMachineID, ServiceActivateLicense } from '../../../../wailsjs/go/main/App';

export function LicenseActivationPage() {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        licenseKey: 'KMZ-STD-23DK-320A',
        deviceName: '',
        machineId: '',
    });

    const getMachineID = async () => {
        try {
            const result = await ServiceGetMachineID();
            setFormData(prev => ({ ...prev, machineId: result }));
        } catch (error) {
            console.log("Error al obtener ID de maquina")
            console.log("Machine ID error: ", error);
            return;

        }
    }

    useEffect(() => {
        getMachineID();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await ServiceActivateLicense(formData);
            console.log("Result: ", result);
            navigate('/dashboard', { replace: true });
        } catch (error) {
            console.error("Error al activar:", error);
            alert("No se pudo activar la licencia: " + error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen w-full lg:grid lg:grid-cols-2">
            {/* Form Section */}
            <div className="relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-blue-100/50 dark:bg-gradient-to-b dark:from-zinc-950 dark:to-blue-900/30">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mx-auto w-full max-w-[350px] space-y-6"
                >
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                            Kommerze POS
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Portal punto de venta
                        </p>
                    </div>

                    <div className="grid gap-6">
                        <form onSubmit={handleSubmit}>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="licenseKey">Licencia</Label>
                                    <Input
                                        id="licenseKey"
                                        placeholder="admin@softi.digital"
                                        type="text"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        disabled={loading}
                                        value={formData.licenseKey}
                                        onChange={(e) => setFormData({ ...formData, licenseKey: e.target.value })}
                                        className="bg-white/50 dark:bg-zinc-900/50"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <div className="flex items-center">
                                        <Label htmlFor="password">Nombre del dispositivo</Label>
                                    </div>
                                    <Input
                                        id="deviceName"
                                        placeholder="Caja 1"
                                        type="text"
                                        disabled={loading}
                                        value={formData.deviceName}
                                        onChange={(e) => setFormData({ ...formData, deviceName: e.target.value })}
                                        className="bg-white/50 dark:bg-zinc-900/50"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <div className="flex items-center">
                                        <Label htmlFor="password">Equipo ID</Label>
                                    </div>
                                    <Input
                                        id="machineId"
                                        placeholder="••••••••"
                                        type="text"
                                        disabled={loading}
                                        value={formData.machineId}
                                        className="bg-white/50 dark:bg-zinc-900/50"
                                    />
                                </div>
                                <Button disabled={loading} className="w-full mt-2 bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700">
                                    {loading ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                                            <span>Activando...</span>
                                        </div>
                                    ) : (
                                        'Activar Licencia'
                                    )}
                                </Button>
                            </div>
                        </form>

                    </div>

                </motion.div>

                <footer className="absolute bottom-[10px] left-0 right-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
                    <div className="text-[11px] text-muted-foreground pointer-events-auto">
                        <img src={logo} alt="Logo" className="h-20 w-auto" />
                    </div>
                    <div className="flex gap-4 pointer-events-auto">
                        <a href="#" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">System Status</a>
                        <a href="#" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">Privacy</a>
                    </div>
                </footer>

            </div>

            {/* Visual/Image Section */}
            <div className="hidden lg:block relative overflow-hidden bg-black">
                <motion.div
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 1.2 }}
                    className="absolute inset-0"
                >
                    <img
                        src={heavyMachineryImg}
                        alt="Heavy Machinery"
                        className="h-full w-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                </motion.div>

                <div className="absolute bottom-0 left-0 right-0 p-12 text-white z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                    >
                        <h2 className="text-4xl font-bold tracking-tight mb-4">Kommerze POS - Sayer</h2>
                        <p className="text-lg text-zinc-300 max-w-lg">
                            La forma inteligente de gestionar ventas, clientes e inventario en tiempo real.
                        </p>
                    </motion.div>
                </div>
            </div>

        </div>
    );
}