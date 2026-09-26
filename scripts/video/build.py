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


def text_slide(step, heading, bullets, foot=""):
    img, d = canvas(step)
    d.text((W / 2, 200), heading, font=font(66, True), fill=FG, anchor="mm")
    y = 330
    for b in bullets:
        f = font(40)
        for i, ln in enumerate(wrap(d, b, f, W - 520)):
            d.text((260, y), ("•  " if i == 0 else "    ") + ln, font=f, fill=FG)
            y += 58
        y += 22
    if foot:
        caption(d, foot)
    return img


def code_slide(step, heading, code, foot):
    img, d = canvas(step)
    d.text((W / 2, 190), heading, font=font(60, True), fill=FG, anchor="mm")
    mono = ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", 30)
    x0, y0 = 240, 280
    lines = code.strip("\n").split("\n")
    d.rounded_rectangle([x0 - 40, y0 - 30, W - 200, y0 + len(lines) * 44 + 20], radius=18, fill=(28, 28, 32))
    for i, ln in enumerate(lines):
        d.text((x0, y0 + i * 44), ln, font=mono, fill=(200, 220, 255) if ln.strip().startswith("function") else FG)
    caption(d, foot)
    return img


def flow_slide():
    img, d = canvas("How it works")
    boxes = [("Phone", "World App\nscan door QR"), ("Server", "verify proof\nnullifier -> holder"), ("Ethereum", "hasValidAccess\n(holder, room 101)"), ("Door", "GRANTED\nor DENIED")]
    bw, gap, top = 330, 90, 330
    x0 = (W - (4 * bw + 3 * gap)) / 2
    for i, (h, body) in enumerate(boxes):
        x = x0 + i * (bw + gap)
        d.rounded_rectangle([x, top, x + bw, top + 300], radius=24, outline=(120, 120, 140), width=4)
        d.text((x + bw / 2, top + 70), h, font=font(48, True), fill=FG, anchor="mm")
        d.multiline_text((x + bw / 2, top + 190), body, font=font(32), fill=DIM, anchor="mm", align="center", spacing=12)
        if i < 3:
            ax = x + bw + 12
            d.line([ax, top + 150, ax + gap - 24, top + 150], fill=FG, width=6)
            d.polygon([(ax + gap - 24, top + 136), (ax + gap - 6, top + 150), (ax + gap - 24, top + 164)], fill=FG)
    caption(d, "Guests need no wallet: one holder address per person, derived from the World ID nullifier")
    return img


SLIDES = [
    (title_slide, "Japan has millions of empty houses. We want to turn them into a basecamp for travelers and working-holiday makers: stay, leave your luggage, travel, come back. But giving a stranger the key to a home needs trust."),
    (lambda: text_slide("Why", "Why we built this", [
        "Toru runs a guesthouse in Asakusa, Tokyo.",
        "He helped a working-holiday visitor from Uruguay settle in: an address, a phone, a bank account, the local festival, a job hunt.",
        "Japan has millions of cheap vacant houses. They could be a basecamp: stay, leave luggage, travel, come back.",
        "Japanese minpaku law requires an identity check and a guest register for every guest.",
    ]), "This idea comes from real life. Toru runs a guesthouse in Asakusa, and helped a working-holiday visitor from Uruguay settle in Japan: an address, a phone, a bank account, even the local festival. Japan has millions of cheap vacant houses that could become a basecamp. But the law requires an identity check and a guest register for every guest, and the owner must trust the person who gets the key."),
    (concept_slide, "Basecamp Pass splits that trust in two. World ID says who you are. Ethereum says whether you may enter this room, right now. The door needs both."),
    (flow_slide, "Here is the flow. The guest scans the QR code on the door screen with World App. Our server verifies the proof with World, and gets a nullifier, which is the same for the same person. From it, the server derives a holder address, so the guest needs no wallet. Then it asks the contract on Ethereum: does this holder have a valid key for room one oh one, right now? Only if the answer is true, the door opens."),
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
    (lambda: code_slide("Smart contract", "One rule the door calls", """
function hasValidAccess(address user, bytes32 roomId) view returns (bool)
    for each key the user holds:
        if key.roomId == roomId
           and validFrom <= block.timestamp <= validUntil
           and not key.revoked:
            return true
    return false

function issue(holder, roomId, validFrom, validUntil)   onlyOwner
function revoke(tokenId)                                 onlyOwner
transferFrom / approve / setApprovalForAll                -> revert (soulbound)
""", "ERC-721 + ERC-5192: a key cannot be transferred, approved or sold"),
     "The contract is small on purpose. The door calls one rule: has valid access. It is true only if the user holds a key for this room, inside its time window, and not revoked. Only the property manager can issue or revoke. Every transfer and approval reverts, so a key is bound to one person and cannot be sold."),
    (lambda: text_slide("Privacy", "What goes on chain, and what never does", [
        "On chain: holder address, token id, room id, valid from, valid until, status.",
        "Never on chain: name, address, My Number, passport number, face image, or the World ID nullifier.",
        "The holder address is an HMAC of the nullifier with a server secret: it cannot be linked back without the secret.",
    ]), "Privacy matters here. On chain we only keep a holder address, the token id, the room, the time window, and the status. Names, My Number, passport numbers, face images, and even the World ID nullifier never go on chain."),
    (lambda: text_slide("Tests", "Friend B, tested locally with 15 checks", [
        "A and B have different nullifiers, so different holder addresses.",
        "A with a key: granted.  B without a key: denied.  Wrong room: denied.",
        "A tries to transfer the key to B: reverts. B is still denied.",
        "Not yet valid: denied.  After the window: expired.  After revoke: denied.",
    ], "15 / 15 PASS on a local anvil chain, using the same library as the app"),
     "We tested two different people, contract holder A and friend B, on a local chain with the same code the app uses. A with a key is granted. B without a key is denied. If A tries to transfer the key to B, the transaction reverts. Not yet valid, expired, and revoked keys are all denied. Fifteen out of fifteen checks pass."),
    (lambda: text_slide("Honest status", "What we could not finish", [
        "A second real person in production: our helper could not come tonight. Friend B is covered by the local tests.",
        "In the World ID staging simulator, every identity returned the same nullifier. We reported it to the World team.",
        "No physical smart lock yet: the door screen shows the result, and lib/lock.ts is the adapter for SwitchBot or SESAME.",
    ]), "To be honest about what is not done. We could not test a second real person in production tonight, so friend B is covered by the local tests. In the World ID staging simulator every identity returned the same nullifier, which we reported to the World team. And there is no physical lock yet: the adapter is ready for SwitchBot or SESAME."),
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
