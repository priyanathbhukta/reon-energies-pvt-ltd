'use client';

import { useRef, useEffect } from 'react';
import { Download, HelpCircle, Image as ImageIcon, Smartphone } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

export default function MarketingStudioPage() {
  const { user, partner } = useAuthStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Shop Info
  const shopName = partner?.shopName || user?.fullName || 'REON Partner';
  const phone = user?.mobile || 'Call Us Today';

  useEffect(() => {
    drawBanner();
  }, [shopName, phone]);

  const drawBanner = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const posterPath = '/banners/permanent-banner.jpg'; 
    
    try {
      const img = new window.Image();
      img.src = posterPath;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Use the image's exact intrinsic dimensions to avoid cropping
      const baseWidth = img.width;
      const baseHeight = img.height;
      
      // Calculate a proportional footer height (e.g., 12% of the width)
      const footerHeight = Math.round(baseWidth * 0.12);

      // High-resolution scale for downloading
      const scale = 2;
      canvas.width = baseWidth * scale; 
      canvas.height = (baseHeight + footerHeight) * scale;
      ctx.scale(scale, scale);

      // Fill background with white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, baseWidth, baseHeight + footerHeight);

      // Draw the exact image without any cropping
      ctx.drawImage(img, 0, 0, baseWidth, baseHeight);

      // Footer / Partner Info background
      ctx.fillStyle = '#0f172a'; // Navy dark color for footer
      ctx.fillRect(0, baseHeight, baseWidth, footerHeight);
      
      // Draw dynamic text
      ctx.fillStyle = '#ffffff';
      
      // POSP Name
      const nameFontSize = Math.round(baseWidth * 0.045);
      ctx.font = `bold ${nameFontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(shopName, baseWidth / 2, baseHeight + (footerHeight * 0.45));

      // Contact Number
      const phoneFontSize = Math.round(baseWidth * 0.035);
      ctx.font = `${phoneFontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('📞 ' + phone, baseWidth / 2, baseHeight + (footerHeight * 0.8));

    } catch (err) {
      // Fallback if image not found
      const baseWidth = 1080;
      const baseHeight = 900;
      const footerHeight = 180;
      const scale = 2;
      canvas.width = baseWidth * scale; 
      canvas.height = (baseHeight + footerHeight) * scale;
      ctx.scale(scale, scale);

      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, baseWidth, baseHeight);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '40px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Permanent Poster Area (Image Missing)', baseWidth / 2, baseHeight / 2);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, baseHeight, baseWidth, footerHeight);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 50px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(shopName, baseWidth / 2, baseHeight + 80);
      ctx.font = '40px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📞 ' + phone, baseWidth / 2, baseHeight + 140);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `reon-marketing-banner-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground font-display">
          Marketing Studio
        </h1>
        <p className="text-muted-foreground mt-1">
          Download your personalized promotional banner
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Info / Settings */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5 text-emerald-500" />
              Your Banner Details
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">POSP Name</label>
                <p className="font-medium text-lg mt-1">{shopName}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Contact Number</label>
                <p className="font-medium text-lg mt-1">{phone}</p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3 text-emerald-700 dark:text-emerald-400">
            <HelpCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              This permanent marketing banner has been generated automatically with your partner details. You can download and share it directly with your customers.
            </p>
          </div>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-emerald-500" />
              Live Preview
            </h2>
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20"
            >
              <Download className="w-4 h-4" />
              Download High-Res
            </button>
          </div>
          
          <div className="relative w-full max-w-[500px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-100 dark:border-slate-800 bg-slate-50 flex items-center justify-center">
            {/* The actual canvas used for rendering (scaled via CSS for preview) */}
            <canvas 
              ref={canvasRef} 
              className="w-full h-full object-contain"
            />
          </div>
          
          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
            <Smartphone className="w-4 h-4" />
            Optimized for WhatsApp, Facebook, and Instagram (1080x1080)
          </p>
        </div>
      </div>
    </div>
  );
}
