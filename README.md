# RecentItems

## Important: this extension is not being updated on extensions.gnome.org for now

### tl;dr
You need to install the extension manually:
1. download the latest release
2. extract the folder to ~/.local/share/gnome-shell/extensions/RecentItems@bananenfisch.net
3. compile schemas, commandline: `glib-compile-schemas ~/.local/share/gnome-shell/extensions/RecentItems@bananenfisch.net/schemas`

### Why?
The latest "GNOME Shell Extensions Review Guidelines" [https://gjs.guide/extensions/review-guidelines/review-guidelines.html#do-not-import-gtk-libraries-in-gnome-shell]:
"Do not import GTK libraries"

This extension uses the GTK.RecentManager to have access to the recent files. This works fine, but by importing GTK.RecentManager it's not compatible with the guidelines for extensions.gnome.org.

The previous solution (implement a custom RecentManger) would work, but there are many cons:
1. it violates the KISS principle - there is already a RecentManger implemented (in GTK)
2. it's more buggy, because every time gnome changes something on the RecentManager, it could break
3. it's bad memory management: the GTK.RecentManager already holds all items in the memory, it's ugly to read out the whole recent-items file and hold all items again

So until there is no better solution, i will maintain this extension, but cannot upload to gnome.

## Recent Items - an extension for gnome-shell

- left click to open file/folder
- right click to open containing folder

<https://extensions.gnome.org/extension/72/recent-items/>

## TODOS:

- Do not list deleted files
- shortcut, like \<super\>+r
- search input field
- hide button after cleaning
- simple float right icon to remove an item from list
- option to pin files on top?
