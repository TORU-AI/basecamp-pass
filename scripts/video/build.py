"""Build the demo video from docs/screenshots: slide PNGs + macOS `say` narration → MP4.

python3 scripts/video/build.py  →  ~/Downloads/Basecamp Pass デモ動画.mp4
"""
import os
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SHOTS = ROOT / "docs/screenshots"
WORK = ROOT / "scripts/video/out"
OUT = Path.home() / "Downloads/Basecamp Pass デモ動画.mp4"
W, H = 1920, 1080
BG, FG, DIM = (13, 13, 13), (240, 240, 240), (140, 140, 140)
GREEN, RED = (22, 163, 74), (220, 38, 38)
AVENIR = "/System/Library/Fonts/Avenir Next.ttc"
VOICE, RATE = "Samantha", "172"


def font(size, bold=False):
    # Avenir Next.ttc: index 0 = Bold, 7 = Regular
    return ImageFont.truetype(AVENIR, size, index=0 if bold else 7)


def wrap(draw, text, f, width):
    words, lines, line = text.split(), [], ""
    for w in words:
        test = f"{line} {w}".strip()
        if draw.textlength(test, font=f) <= width:
            line = test
        else:
            lines.append(line)
            line = w
    lines.append(line)
    return lines


def canvas(step):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    d.text((80, 50), "BASECAMP PASS", font=font(28, True), fill=DIM)
    if step:
        tw = d.textlength(step, font=font(28))
        d.text((W - 80 - tw, 50), step, font=font(28), fill=DIM)
    return img, d


def caption(d, text, color=FG):
    f = font(46, True)
    lines = wrap(d, text, f, W - 240)
    y = H - 70 - len(lines) * 62
    for ln in lines:
        d.text(((W - d.textlength(ln, font=f)) / 2, y), ln, font=f, fill=color)
        y += 62


def shot_slide(name, step, text, color=FG):
    img, d = canvas(step)
    s = Image.open(SHOTS / name).convert("RGB")
    box_w, box_h = W - 240, H - 330
    s.thumbnail((box_w, box_h), Image.LANCZOS)
    x, y = (W - s.width) // 2, 120 + (box_h - s.height) // 2
    img.paste(s, (x, y))
    d.rectangle([x - 1, y - 1, x + s.width, y + s.height], outline=(60, 60, 60), width=2)
    caption(d, text, color)
    return img


def title_slide():
    img, d = canvas("")
    d.text((W / 2, 380), "Basecamp Pass", font=font(120, True), fill=FG, anchor="mm")
    d.text((W / 2, 520), "World ID says who you are.", font=font(56), fill=FG, anchor="mm")
    d.text((W / 2, 600), "Ethereum says whether you may enter.", font=font(56), fill=FG, anchor="mm")
    d.text((W / 2, 760), "A digital key for Japan's vacant houses · ETHGlobal Tokyo 2026", font=font(34), fill=DIM, anchor="mm")
    return img


def concept_slide():
    img, d = canvas("How it works")
    cols = [
        ("World ID", "Who is this person?", "Passport / My Number Card\n+ face check at check-in", (59, 130, 246)),
        ("Ethereum", "May they enter now?", "Soulbound access key\nroom · valid from / until · revoke", (139, 92, 246)),
        ("Door", "Both must be true", "Verified + valid key\n= unlock", GREEN),
    ]
    cw, gap, top = 500, 70, 250
    x0 = (W - (3 * cw + 2 * gap)) / 2
    for i, (head, q, body, col) in enumerate(cols):
        x = x0 + i * (cw + gap)
        d.rounded_rectangle([x, top, x + cw, top + 480], radius=28, outline=col, width=5)
        d.text((x + cw / 2, top + 80), head, font=font(64, True), fill=col, anchor="mm")
        d.text((x + cw / 2, top + 180), q, font=font(38, True), fill=FG, anchor="mm")
        d.multiline_text((x + cw / 2, top + 320), body, font=font(32), fill=DIM, anchor="mm", align="center", spacing=14)
        if i < 2:
            d.text((x + cw + gap / 2, top + 240), "+" if i == 0 else "=", font=font(72, True), fill=FG, anchor="mm")
    caption(d, "World ID alone never opens the door.")
    return img


def closing_slide():
    img, d = canvas("")
    steps = ["Identity", "Contract", "Payment", "Access Right", "Physical Access"]
    tech = ["World ID · live", "e-contract", "JPYC", "Ethereum · live", "Smart lock"]
    bw, gap, top = 300, 40, 300
    x0 = (W - (5 * bw + 4 * gap)) / 2
    for i, (s, t) in enumerate(zip(steps, tech)):
        x = x0 + i * (bw + gap)
        done = "live" in t
        d.rounded_rectangle([x, top, x + bw, top + 200], radius=24, outline=GREEN if done else (80, 80, 80), width=4)
        d.text((x + bw / 2, top + 70), s, font=font(36, True), fill=FG, anchor="mm")
        d.text((x + bw / 2, top + 135), t, font=font(30), fill=GREEN if done else DIM, anchor="mm")
    d.text((W / 2, 640), "basecamp-pass.vercel.app", font=font(48, True), fill=FG, anchor="mm")
    d.text((W / 2, 710), "github.com/TORU-AI/basecamp-pass", font=font(36), fill=DIM, anchor="mm")
    d.text((W / 2, 765), "Contract on Sepolia: 0xcd3c9dfdbe4093c6fe53b01a1700a348383d53f1", font=font(30), fill=DIM, anchor="mm")
    return img


SLIDES = [
    (title_slide, "Japan has millions of empty houses. We want to turn them into a basecamp for travelers and working-holiday makers: stay, leave your luggage, travel, come back. But giving a stranger the key to a home needs trust."),
    (concept_slide, "Basecamp Pass splits that trust in two. World ID says who you are. Ethereum says whether you may enter this room, right now. The door needs both."),
    (lambda: shot_slide("03-world-id-connect-phone.png", "1 · Identity", "Scan the door QR with World App (My Number Card)"),
     "I checked in once with my My Number Card and a live face check. Now, at the door, I scan the QR code with World App. We never see the document."),
    (lambda: shot_slide("04-door-denied-no-key.png", "1 · Identity", "Identity verified, but no key on chain: DENIED", RED),
     "Identity verified. But there is no access key on chain, so the door stays locked."),
    (lambda: shot_slide("06-admin-key-issued.png", "2 · Access right", "The property manager issues a key: Room 101, until Sep 30"),
     "The property manager issues a digital key for room one oh one, valid until September thirtieth."),
    (lambda: shot_slide("07-etherscan-mint.png", "2 · Access right", "Minted on Ethereum Sepolia · soulbound · no personal data on chain"),
     "It is minted on Ethereum Sepolia as a soulbound token. It cannot be transferred or sold, and no personal data goes on chain. Only an address, the room, and the time window."),
    (lambda: shot_slide("08-door-granted.png", "3 · Door", "Same person, now with a valid key: GRANTED", GREEN),
     "Same person, now with a valid key. Access granted. Door unlocked."),
    (lambda: shot_slide("09-admin-key-revoked.png", "4 · Emergency", "The manager revokes the key on chain"),
     "In an emergency, the manager revokes the key on chain."),
    (lambda: shot_slide("10-door-denied-revoked.png", "4 · Emergency", "Same person again, key revoked: DENIED", RED),
     "Same person again. World ID still succeeds, but the key is revoked, so access is denied."),
    (closing_slide, "Identity and access right are working today. Next come the e-contract, payment in JPYC, and a real smart lock. Basecamp Pass. A home base in Japan, opened only for the right person."),
]


def run(*cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def duration(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)])
    return float(out)


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    clips = []
    for i, (make, narration) in enumerate(SLIDES, 1):
        png, aiff, mp4 = WORK / f"{i:02}.png", WORK / f"{i:02}.aiff", WORK / f"{i:02}.mp4"
        make().save(png)
        run("say", "-v", VOICE, "-r", RATE, "-o", str(aiff), narration)
        dur = duration(aiff) + 1.0
        run("ffmpeg", "-y", "-loop", "1", "-i", str(png), "-i", str(aiff),
            "-filter_complex",
            f"[0:v]fade=t=in:st=0:d=0.3,fade=t=out:st={dur - 0.3:.2f}:d=0.3,format=yuv420p[v];"
            f"[1:a]adelay=400|400,apad,aresample=48000[a]",
            "-map", "[v]", "-map", "[a]", "-t", f"{dur:.2f}", "-r", "30",
            "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "aac", "-b:a", "192k", str(mp4))
        clips.append(mp4)
        print(f"slide {i}: {dur:.1f}s")
    lst = WORK / "list.txt"
    lst.write_text("".join(f"file '{c}'\n" for c in clips))
    run("ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", "-movflags", "+faststart", str(OUT))
    print(f"→ {OUT} ({duration(OUT):.1f}s)")


if __name__ == "__main__":
    main()
