"use client";

import React, { useState, useRef } from 'react';
import { Camera, X, Check, MapPin, Sparkles, Loader2, AlertCircle, Plus, Image as ImageIcon } from 'lucide-react';
import { compressImage } from '../../lib/media/compressImage';
import { detectCity } from '../../lib/geo/detectCity';
import { useAuth } from '../../context/AuthContext';

interface TagStrayModalProps {
  onClose: () => void;
  onSuccess: () => void;
  userCoords: { lat: number; lng: number } | null;
  onOpenAuth: () => void;
}

export default function TagStrayModal({ onClose, onSuccess, userCoords, onOpenAuth }: TagStrayModalProps) {
  const { user } = useAuth();

  const [species, setSpecies] = useState<'cat' | 'dog'>('cat');
  const [name, setName] = useState('');
  const [coatDescription, setCoatDescription] = useState('');
  const [healthStatus, setHealthStatus] = useState<string>('healthy');
  const [isTnr, setIsTnr] = useState(false);

  // Photos: 1 Identifier Photo + up to 3 Additional Photos (Max 4 Total)
  const [identifierPhoto, setIdentifierPhoto] = useState<string | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState<string>('');

  const identifierInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Compress and convert file to Base64 data URL for instant standalone CSV & web storage
  const processImageFile = async (rawFile: File): Promise<string> => {
    const compressed = await compressImage(rawFile);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(compressed);
    });
  };

  // Handle Identifier photo selection (Mandatory, shown in Life360 map pin)
  const handleIdentifierPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    try {
      setIsCompressing(true);
      setStatusText('Optimizing identifier photo (<250KB)...');
      const base64 = await processImageFile(e.target.files[0]);
      setIdentifierPhoto(base64);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCompressing(false);
      setStatusText('');
    }
  };

  // Handle Additional photos selection (Up to 3 more photos)
  const handleGalleryPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      setIsCompressing(true);
      setStatusText('Compressing gallery photos...');
      const remainingSlots = 3 - galleryPhotos.length;
      const filesToProcess = Array.from(e.target.files).slice(0, remainingSlots);

      const processed = await Promise.all(filesToProcess.map((f) => processImageFile(f)));
      setGalleryPhotos((prev) => [...prev, ...processed].slice(0, 3));
    } catch (err) {
      console.error(err);
    } finally {
      setIsCompressing(false);
      setStatusText('');
    }
  };

  const removeGalleryPhoto = (index: number) => {
    setGalleryPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifierPhoto) {
      alert('Please add the 1st Identifier Photo for the map pin.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Determine GPS position
      let lat = userCoords?.lat || 14.5995;
      let lng = userCoords?.lng || 120.9842;

      if (navigator.geolocation) {
        setStatusText('Locking GPS coordinates...');
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 6000,
            });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch (geoErr) {
          console.warn('Geolocation fallback to map coordinates', geoErr);
        }
      }

      const city = detectCity(lat, lng);

      setStatusText('Saving buddy & fuzzing safety coordinates...');
      const res = await fetch('/api/strays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || (species === 'cat' ? 'Community Cat' : 'Community Dog'),
          species,
          coat_description: coatDescription.trim() || null,
          health_status: healthStatus,
          is_tnr: isTnr,
          city,
          exact_lat: lat,
          exact_lng: lng,
          identifier_photo_url: identifierPhoto,
          gallery_photos: galleryPhotos,
          created_by: user?.id || null,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create stray sighting');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(`Error saving stray: ${err.message || 'Please check connection'}`);
    } finally {
      setIsSubmitting(false);
      setStatusText('');
    }
  };

  return (
    <div className="fixed inset-0 z-[970] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-fade-in select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-[32px] sm:rounded-3xl shadow-2xl p-5 sm:p-6 text-slate-100 max-h-[92vh] overflow-y-auto pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
              🐾
            </div>
            <div>
              <h2 className="text-base font-black text-white">Tag Stray Animal</h2>
              <p className="text-[11px] text-slate-400">1 Map Identifier + up to 3 gallery photos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. Identifier Photo (Map Pin Avatar) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                1. Identifier Photo (Shown in Life360 Map Pin) <span className="text-emerald-400">*</span>
              </label>
              <span className="text-[10px] text-slate-500 font-semibold">1 required</span>
            </div>

            <input
              ref={identifierInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleIdentifierPhoto}
              className="hidden"
            />

            {identifierPhoto ? (
              <div className="relative w-full h-40 rounded-2xl overflow-hidden border-2 border-emerald-500/80 bg-slate-950">
                <img src={identifierPhoto} alt="Identifier Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => identifierInputRef.current?.click()}
                  className="absolute bottom-2 right-2 px-3 py-1 bg-black/70 backdrop-blur-md text-white text-[11px] rounded-xl font-bold border border-white/20 flex items-center gap-1"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  Change Identifier
                </button>
              </div>
            ) : (
              <div
                onClick={() => identifierInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-800/40 hover:bg-slate-800/70 transition-all p-3 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <div className="text-xs text-slate-200 font-bold">
                  Snap or Upload Main Identifier Photo
                </div>
                <p className="text-[10px] text-slate-500">
                  This photo will be displayed directly inside the map pin bubble
                </p>
              </div>
            )}
          </div>

          {/* 2. Up to 3 Additional Gallery Photos */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                2. Additional Profile Photos ({galleryPhotos.length}/3)
              </label>
              <span className="text-[10px] text-slate-500">Optional (Viewed when pin is clicked)</span>
            </div>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleGalleryPhotos}
              className="hidden"
            />

            <div className="grid grid-cols-3 gap-2">
              {galleryPhotos.map((photo, idx) => (
                <div key={idx} className="relative h-24 rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                  <img src={photo} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeGalleryPhoto(idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {galleryPhotos.length < 3 && (
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="h-24 border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-xl flex flex-col items-center justify-center gap-1 bg-slate-800/30 hover:bg-slate-800/60 transition-all text-slate-400 hover:text-white"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-[10px] font-bold">+ Add Photo</span>
                </button>
              )}
            </div>
          </div>

          {/* Species Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Species <span className="text-emerald-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSpecies('cat')}
                className={`py-2.5 px-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  species === 'cat'
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300'
                }`}
              >
                <span className="text-lg">🐱</span>
                <span>Cat (Puspin)</span>
              </button>
              <button
                type="button"
                onClick={() => setSpecies('dog')}
                className={`py-2.5 px-3 rounded-2xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                  species === 'dog'
                    ? 'bg-amber-600 border-amber-500 text-white shadow-lg'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300'
                }`}
              >
                <span className="text-lg">🐶</span>
                <span>Dog (Aspin)</span>
              </button>
            </div>
          </div>

          {/* Name & Short Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Animal Name / Tag
              </label>
              <input
                type="text"
                placeholder={species === 'cat' ? 'e.g. Mochi (Orange Tabby)' : 'e.g. Brownie'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Short Description / Markings
              </label>
              <input
                type="text"
                placeholder="e.g. White paws, friendly, stays by 7-Eleven"
                value={coatDescription}
                onChange={(e) => setCoatDescription(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Health Condition */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
              Health Condition
            </label>
            <select
              value={healthStatus}
              onChange={(e) => setHealthStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="healthy">🟢 Healthy & Active</option>
              <option value="needs_food">🟡 Needs Food / Malnourished</option>
              <option value="injured">🔴 Injured / Urgent Medical Care</option>
              <option value="pregnant_nursing">🌸 Pregnant / Nursing Puppies or Kittens</option>
              <option value="collared">🟣 Collared (Suspected Lost Pet)</option>
            </select>
          </div>

          {/* TNR Ear-Tipped Checkbox */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
            <input
              type="checkbox"
              checked={isTnr}
              onChange={(e) => setIsTnr(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-0"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-200">TNR Verified (Ear-Tipped)</span>
              <p className="text-[10px] text-slate-400">Animal has a clipped/notched left ear indicating spay/neuter.</p>
            </div>
          </label>

          {/* Loading status */}
          {statusText && (
            <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-semibold animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{statusText}</span>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-1/3 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !identifierPhoto}
              className="w-2/3 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Pinning Buddy...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>Pin Sighting (+20 XP)</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
