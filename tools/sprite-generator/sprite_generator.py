#!/usr/bin/env python3
"""
Mascot Sprite Generator & Post-Processor Utility
Extracts clean, transparent 2D frames and builds transparent GIF loops from sprite sheets.
Inspired by aldegad/sprite-gen.
"""

import argparse
import os
import math
from PIL import Image

def color_distance(c1, c2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(c1, c2)))

def remove_chroma_background(image, chroma_key, threshold=40):
    """
    Cleans background pixels by comparing Euclidean distance to the chroma color.
    Returns an RGBA image with background pixels set to transparent (0, 0, 0, 0).
    """
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            
            dist = color_distance((r, g, b), chroma_key)
            if dist <= threshold:
                pixels[x, y] = (0, 0, 0, 0)
    return rgba

def extract_grid_frames(image, rows, cols, padding_crop=True):
    """
    Slices the image into a grid of rows and columns.
    If padding_crop is enabled, it auto-trims extra transparency around the sprite.
    """
    width, height = image.size
    cell_w = width // cols
    cell_h = height // rows
    
    frames = []
    for r in range(rows):
        for c in range(cols):
            box = (c * cell_w, r * cell_h, (c + 1) * cell_w, (r + 1) * cell_h)
            frame = image.crop(box)
            
            # Check if frame is empty/fully transparent
            extrema = frame.getchannel("A").getextrema()
            if extrema == (0, 0) or extrema is None:
                continue # Skip empty frame
            
            if padding_crop:
                # Crop bounding box of non-zero alpha pixels to center the mascot
                bbox = frame.getbbox()
                if bbox:
                    frame = frame.crop(bbox)
            
            frames.append(frame)
    return frames

def compose_gif(frames, output_path, fps=12):
    """
    Compiles list of RGBA frames into a transparent looping GIF.
    """
    if not frames:
        print("[-] No frames available to compose GIF.")
        return False
    
    duration = int(1000 / fps)
    
    # Convert RGBA to P mode with transparency mapping to avoid color corruption in GIF
    gif_frames = []
    for frame in frames:
        alpha = frame.split()[-1]
        # Create a palette image
        im_p = frame.convert("RGB").convert("P", palette=Image.Palette.ADAPTIVE, colors=255)
        # Map transparent pixels to color index 255
        mask = Image.eval(alpha, lambda a: 255 if a < 128 else 0)
        im_p.paste(255, mask)
        gif_frames.append(im_p)
        
    gif_frames[0].save(
        output_path,
        save_all=True,
        append_images=gif_frames[1:],
        duration=duration,
        loop=0,
        transparency=255,
        disposal=2 # Clear frame background before drawing next
    )
    print(f"[+] Transparent GIF saved successfully to: {output_path}")
    return True

def main():
    parser = argparse.ArgumentParser(description="Clean 2D game sprites & transparent GIF generator")
    parser.add_argument("--sheet", required=True, help="Path to raw sprite sheet image (PNG/JPG)")
    parser.add_argument("--out-dir", required=True, help="Output directory to save frames and GIF")
    parser.add_argument("--action", default="walk", help="Mascot state name (e.g. idle, walk, sleep, typing)")
    parser.add_argument("--rows", type=int, default=1, help="Grid rows in sprite sheet")
    parser.add_argument("--cols", type=int, default=1, help="Grid columns in sprite sheet")
    parser.add_argument("--chroma", default="255,255,255", help="Comma-separated RGB background key to mask out")
    parser.add_argument("--threshold", type=int, default=45, help="Euclidean color distance threshold for keying")
    parser.add_argument("--fps", type=int, default=10, help="Frames per second for output GIF animation")
    parser.add_argument("--no-trim", action="store_true", help="Disable auto-cropping of bounding box margins")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.sheet):
        print(f"[-] Sprite sheet file not found: {args.sheet}")
        return
        
    os.makedirs(args.out_dir, exist_ok=True)
    
    # Parse chroma key
    try:
        chroma_key = tuple(map(int, args.chroma.split(",")))
    except Exception:
        print("[-] Invalid chroma color format. Use: R,G,B (e.g. 255,255,255)")
        return
        
    print(f"[*] Loading sprite sheet: {args.sheet}")
    img = Image.open(args.sheet)
    
    print(f"[*] Masking background with key {chroma_key} (threshold: {args.threshold})...")
    transparent_img = remove_chroma_background(img, chroma_key, args.threshold)
    
    print(f"[*] Splitting image into {args.rows}x{args.cols} grid...")
    frames = extract_grid_frames(transparent_img, args.rows, args.cols, not args.no_trim)
    print(f"[+] Extracted {len(frames)} valid sprite frames.")
    
    # Save individual PNG frames
    for idx, frame in enumerate(frames):
        frame_path = os.path.join(args.out_dir, f"frame_{idx:02d}.png")
        frame.save(frame_path, "PNG")
        
    print(f"[+] Stretched PNG frames saved in: {args.out_dir}")
    
    # Compose GIF loop
    gif_path = os.path.join(args.out_dir, f"{args.action}.gif")
    compose_gif(frames, gif_path, args.fps)

if __name__ == "__main__":
    main()
