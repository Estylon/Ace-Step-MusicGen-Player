import soundfile as sf
import numpy as np
import sys, os

AUDIO_DIR = "E:/Ace-Step-MusicGen-Player/app/backend/audio_output"
files = [
    os.path.join(AUDIO_DIR, "6cd6d155-8af6-54f6-78c9-6c70de8dc107.flac"),
    os.path.join(AUDIO_DIR, "7f9fad92-e9c6-0ae4-aadb-805b6d0c5625.mp3"),
    os.path.join(AUDIO_DIR, "0b61ea56-1bdb-4522-c606-a63db2fc580f.mp3"),
]

def compute_zcr(signal, frame_size=1024, hop_size=512):
    zcr_vals = []
    for i in range(0, len(signal) - frame_size, hop_size):
        frame = signal[i:i+frame_size]
        zcr = np.sum(np.abs(np.diff(np.sign(frame))) > 0) / (2.0 * frame_size)
        zcr_vals.append(zcr)
    return np.mean(zcr_vals) if zcr_vals else 0.0

def compute_autocorrelation(signal, max_lag=500):
    if len(signal) < max_lag * 2:
        max_lag = len(signal) // 4
    sig = signal - np.mean(signal)
    norm = np.sum(sig**2)
    if norm < 1e-12:
        return 0.0
    autocorr = np.correlate(sig[:max_lag*2], sig[:max_lag*2], mode="full")
    autocorr = autocorr / norm
    mid = len(autocorr) // 2
    start = mid + 20
    end = mid + max_lag
    if start >= len(autocorr) or end > len(autocorr):
        return 0.0
    return np.max(autocorr[start:end])

def compute_spectral_centroid(signal, sr, frame_size=2048):
    centroids = []
    for i in range(0, len(signal) - frame_size, frame_size):
        frame = signal[i:i+frame_size]
        spectrum = np.abs(np.fft.rfft(frame))
        freqs = np.fft.rfftfreq(frame_size, d=1.0/sr)
        if np.sum(spectrum) < 1e-12:
            centroids.append(0.0)
        else:
            centroids.append(np.sum(freqs * spectrum) / np.sum(spectrum))
    return np.mean(centroids) if centroids else 0.0

def check_uniform_distribution(signal, n_bins=50):
    hist, _ = np.histogram(signal, bins=n_bins, density=True)
    if np.mean(hist) < 1e-12:
        return 0.0
    cv = np.std(hist) / np.mean(hist)
    return cv

def find_dominant_frequencies(signal, sr, n_top=5, frame_size=8192):
    if len(signal) < frame_size:
        frame_size = len(signal)
    spectrum = np.abs(np.fft.rfft(signal[:frame_size]))
    freqs = np.fft.rfftfreq(frame_size, d=1.0/sr)
    peaks = []
    for i in range(1, len(spectrum)-1):
        if spectrum[i] > spectrum[i-1] and spectrum[i] > spectrum[i+1]:
            peaks.append((freqs[i], spectrum[i]))
    if not peaks:
        return [], 0.0
    peaks.sort(key=lambda x: x[1], reverse=True)
    top_peaks = peaks[:n_top]
    total_energy = np.sum(spectrum**2)
    if total_energy < 1e-12:
        return top_peaks, 0.0
    peak_energy = 0
    for freq, mag in top_peaks:
        idx = np.argmin(np.abs(freqs - freq))
        lo = max(0, idx - 3)
        hi = min(len(spectrum), idx + 4)
        peak_energy += np.sum(spectrum[lo:hi]**2)
    tonality = peak_energy / total_energy
    return top_peaks, tonality

def analyze_file(filepath):
    basename = os.path.basename(filepath)
    sep = "=" * 90
    print(sep)
    print(f"FILE: {basename}")
    print(f"PATH: {filepath}")
    print(f"SIZE: {os.path.getsize(filepath):,} bytes")
    print(sep)
    try:
        data, sr = sf.read(filepath, dtype="float64")
    except Exception as e:
        print(f"  ERROR reading file: {e}")
        return
    if data.ndim == 1:
        channels = 1
        mono = data
    else:
        channels = data.shape[1]
        mono = np.mean(data, axis=1)
    duration = len(mono) / sr
    print(f"  Sample Rate:  {sr} Hz")
    print(f"  Channels:     {channels}")
    print(f"  Duration:     {duration:.3f} seconds ({len(mono):,} samples)")
    print(f"  Dtype:        {data.dtype}")
    print()
    rms_overall = np.sqrt(np.mean(mono**2))
    peak = np.max(np.abs(mono))
    rms_db = 20 * np.log10(rms_overall) if rms_overall > 1e-12 else -120.0
    peak_db = 20 * np.log10(peak) if peak > 1e-12 else -120.0
    print("  --- Levels ---")
    print(f"  Overall RMS:  {rms_overall:.6f}  ({rms_db:.1f} dB)")
    print(f"  Peak Level:   {peak:.6f}  ({peak_db:.1f} dB)")
    is_silence = rms_overall < 0.001
    print(f"  Is Silence:   {is_silence}  (RMS < 0.001 threshold)")
    print()
    print("  --- Per-Second RMS (first 5s) ---")
    for sec in range(min(5, int(np.ceil(duration)))):
        s_idx = sec * sr
        e_idx = min((sec+1) * sr, len(mono))
        chunk = mono[s_idx:e_idx]
        sec_rms = np.sqrt(np.mean(chunk**2))
        sec_db = 20 * np.log10(sec_rms) if sec_rms > 1e-12 else -120.0
        bar = "#" * int(sec_rms * 200)
        print(f"    Second {sec}: RMS={sec_rms:.6f} ({sec_db:.1f} dB)  |{bar}")
    print()
    analysis_samples = mono[:min(5*sr, len(mono))]
    zcr = compute_zcr(analysis_samples)
    autocorr_peak = compute_autocorrelation(analysis_samples)
    spec_centroid = compute_spectral_centroid(analysis_samples, sr)
    uniformity_cv = check_uniform_distribution(analysis_samples)
    print("  --- Noise/Static Analysis (first 5s) ---")
    nyq4 = sr // 4
    nyq5 = sr / 5
    print(f"  Zero-Crossing Rate:    {zcr:.4f}  (white noise ~0.5, music typically 0.02-0.15)")
    print(f"  Autocorrelation Peak:  {autocorr_peak:.4f}  (noise ~0, tonal >0.3)")
    print(f"  Spectral Centroid:     {spec_centroid:.1f} Hz  (noise ~sr/4={nyq4}, music varies)")
    print(f"  Uniformity CV:         {uniformity_cv:.4f}  (low=uniform/noise-like, high=peaked/tonal)")
    noise_indicators = 0
    if zcr > 0.35:
        noise_indicators += 1
        print("    [!] High ZCR suggests noise/static")
    if autocorr_peak < 0.1:
        noise_indicators += 1
        print("    [!] Low autocorrelation suggests no tonal content")
    if uniformity_cv < 0.5 and rms_overall > 0.001:
        noise_indicators += 1
        print("    [!] Uniform sample distribution suggests noise")
    if spec_centroid > nyq5:
        noise_indicators += 1
        print("    [!] High spectral centroid suggests noise/static")
    if noise_indicators >= 3:
        print(f"  ** VERDICT: Likely NOISE/STATIC ({noise_indicators}/4 indicators) **")
    elif noise_indicators >= 2:
        print(f"  ** VERDICT: Possibly noisy ({noise_indicators}/4 indicators) **")
    else:
        print(f"  ** VERDICT: Likely has tonal/musical content ({noise_indicators}/4 noise indicators) **")
    print()
    print("  --- Sample Value Histogram (10 bins) ---")
    hist, bin_edges = np.histogram(mono, bins=10)
    total_samples = len(mono)
    max_count = max(hist) if max(hist) > 0 else 1
    max_bar = 50
    for i in range(len(hist)):
        lo = bin_edges[i]
        hi = bin_edges[i+1]
        count = hist[i]
        pct = 100.0 * count / total_samples
        bar_len = int(count / max_count * max_bar)
        bar = "#" * bar_len
        print(f"    [{lo:+.4f}, {hi:+.4f}): {count:>10,} ({pct:5.1f}%) |{bar}")
    print()
    print("  --- Tonal Content Analysis (FFT) ---")
    top_freqs, tonality = find_dominant_frequencies(analysis_samples, sr, n_top=8)
    print(f"  Tonality Score: {tonality:.4f}  (>0.1 suggests tonal content, <0.05 likely noise)")
    if top_freqs:
        print(f"  Top {len(top_freqs)} dominant frequencies:")
        note_names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]
        for freq, mag in top_freqs:
            note = ""
            if freq > 20:
                semitone = 12 * np.log2(freq / 440.0) + 69
                note_idx = int(round(semitone)) % 12
                octave = int(round(semitone)) // 12 - 1
                cents_off = (semitone - round(semitone)) * 100
                note = f"  (~{note_names[note_idx]}{octave})"
                if abs(cents_off) > 10:
                    note += f" [{cents_off:+.0f} cents]"
            print(f"    {freq:8.1f} Hz  (magnitude: {mag:.4f}){note}")
    else:
        print("  No dominant frequency peaks found.")
    has_tonal = tonality > 0.1
    print(f"  Has Tonal Content: {has_tonal}")
    print()
    print()

for f in files:
    analyze_file(f)
print("Analysis complete.")
