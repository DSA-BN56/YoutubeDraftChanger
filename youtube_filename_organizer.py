import re
import shutil
from datetime import datetime
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox

# Matches _YYYYMMDD_HHMMSS and ignores anything after the seconds.
# Examples:
# _20240604_220922
# _20240604_220922_99
# _20240604_220922 extra
# _20240604_220922 ()
TIMESTAMP_PATTERN = re.compile(r"_(\d{8})_(\d{6})")


def choose_source_folder():
    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    selected = filedialog.askdirectory(
        title="Select the folder containing your videos"
    )
    root.destroy()
    return Path(selected) if selected else None


def make_new_filename(source_file):
    """Create a Windows-safe readable filename from a timestamp."""

    extension = source_file.suffix
    stem = source_file.name[:-len(extension)] if extension else source_file.name

    match = TIMESTAMP_PATTERN.search(stem)
    if not match:
        return source_file.name, False

    try:
        date_time = datetime.strptime(
            match.group(1) + match.group(2),
            "%Y%m%d%H%M%S"
        )
    except ValueError:
        return source_file.name, False

    # IMPORTANT: Use a hyphen instead of a colon.
    # Windows treats ':' as an alternate data stream separator.
    readable_time = date_time.strftime("%d %b %Y %I-%M%p").lower()

    prefix = stem[:match.start()].rstrip(" _-")
    new_stem = f"{prefix} {readable_time}".strip()

    return new_stem + extension, True


def unique_destination(path):
    if not path.exists():
        return path

    counter = 2
    while True:
        candidate = path.with_name(
            f"{path.stem} ({counter}){path.suffix}"
        )
        if not candidate.exists():
            return candidate
        counter += 1


def main():
    source_folder = choose_source_folder()
    if source_folder is None:
        print("No folder selected. Exiting.")
        return

    destination_folder = source_folder / (source_folder.name + "_Renamed")
    destination_folder.mkdir(parents=True, exist_ok=True)

    copied = renamed = unchanged = failed = 0

    print(f"Source:      {source_folder}")
    print(f"Destination: {destination_folder}\n")

    for source_file in source_folder.iterdir():
        if not source_file.is_file():
            continue

        new_name, was_renamed = make_new_filename(source_file)
        destination = unique_destination(destination_folder / new_name)

        try:
            shutil.copy2(source_file, destination)
            copied += 1

            if was_renamed:
                renamed += 1
                print(f"RENAMED: {source_file.name} -> {destination.name}")
            else:
                unchanged += 1
                print(f"COPIED UNCHANGED: {source_file.name}")

        except OSError as error:
            failed += 1
            print(f"ERROR: {source_file.name}: {error}")

    summary = (
        f"Copy completed.\n\n"
        f"Files copied: {copied}\n"
        f"Files renamed: {renamed}\n"
        f"Names unchanged: {unchanged}\n"
        f"Failed: {failed}\n\n"
        f"Destination:\n{destination_folder}"
    )
    print("\n" + summary)

    root = tk.Tk()
    root.withdraw()
    root.attributes("-topmost", True)
    messagebox.showinfo("Completed", summary)
    root.destroy()


if __name__ == "__main__":
    main()
