import Gio from "gi://Gio";
import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gdk from "gi://Gdk";

import {
  ExtensionPreferences,
  gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export default class RecentItemsPreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    // Prefer max size (800x900) if screen allows it, otherwise scale down
    const MAX_W = 800;
    const MAX_H = 900;

    // these are your fallback ratios for small screens
    const WIDTH_RATIO  = 0.60; // 60% of screen width
    const HEIGHT_RATIO = 0.75; // 75% of screen height

    const MIN_W = 600;
    const MIN_H = 500;

    const display = Gdk.Display.get_default();
    const surface = window.get_surface();

    let monitor = null;
    if (surface) {
      monitor = display.get_monitor_at_surface(surface);
    }
    if (!monitor) {
      monitor = display.get_monitors()?.get_item?.(0) ?? null;
    }

    if (monitor) {
      const geometry = monitor.get_geometry();
      const screenW = geometry.width;
      const screenH = geometry.height;

      const targetW = Math.round(screenW * WIDTH_RATIO);
      const targetH = Math.round(screenH * HEIGHT_RATIO);

      // If there is enough space, we hit MAX_W/MAX_H.
      // Otherwise we use the target sizes.
      const width  = Math.max(MIN_W, Math.min(MAX_W, targetW));
      const height = Math.max(MIN_H, Math.min(MAX_H, targetH));

      window.set_default_size(width, height);

      // Optional but recommended: ensure it never becomes too small (state restore)
      window.set_size_request(MIN_W, MIN_H);
    } else {
      // Fallback
      window.set_default_size(MAX_W, MAX_H);
      window.set_size_request(MIN_W, MIN_H);
    }

    window._settings = this.getSettings();

    const page = new Adw.PreferencesPage({
      title: _("Recent Item Settings"),
      icon_name: "dialog-information-symbolic",
    });

    window.add(page);

    const group = new Adw.PreferencesGroup({
      title: _("Settings"),
    });

    page.add(group);



    let label = null;
    let widget = null;


        
    // Show deleted files
    const showDeletedFilesBox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 10,
      margin_start: 10,
      margin_end: 10,
      margin_top: 10,
      margin_bottom: 10,
    });

    label = new Gtk.Label({
      label: _('Show deleted files'),
      hexpand: true,
      halign: Gtk.Align.START,
    });
    
    widget =new Gtk.Switch({
    });
    window._settings.bind("show-deleted-files", widget, "active", Gio.SettingsBindFlags.DEFAULT);

    showDeletedFilesBox.append(label);
    showDeletedFilesBox.append(widget);
    group.add(showDeletedFilesBox);
    
    
    // Window width
    const windowWidthBox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 10,
      margin_start: 10,
      margin_end: 10,
      margin_top: 10,
      margin_bottom: 10,
    });

    label = new Gtk.Label({
      label: _('Menu width (% of screen)'),
      hexpand: true,
      halign: Gtk.Align.START,
    });
    
    widget =new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: 0,
        upper: 100,
        step_increment: 5,
      }),
      width_chars: 3,
    });
    
    
    window._settings.bind("window-width-percentage", widget, "value", Gio.SettingsBindFlags.DEFAULT);

    windowWidthBox.append(label);
    windowWidthBox.append(widget);
    group.add(windowWidthBox);

    // Item count
    const itemCountBox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 10,
      margin_start: 10,
      margin_end: 10,
      margin_top: 10,
      margin_bottom: 10,
    });
    
    label = new Gtk.Label({
      label: _("Item Count"),
      hexpand: true,
      halign: Gtk.Align.START,
    });


    widget = new Gtk.SpinButton({
      halign: Gtk.Align.END,
      width_chars: 3,
    });
    widget.set_sensitive(true);
    widget.set_range(3, 20);
    widget.set_increments(1, 2);

    window._settings.bind("item-count", widget, "value", Gio.SettingsBindFlags.DEFAULT);

    itemCountBox.append(label);
    itemCountBox.append(widget);
    group.add(itemCountBox);

    // Item Blacklist
    const itemBlacklistBox = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 10,
      margin_start: 10,
      margin_end: 10,
      margin_top: 10,
      margin_bottom: 10,
    });
    
    label = new Gtk.Label({
      label: _("Comma separated Extension and MIME Blacklist")+":",
      hexpand: true,
      halign: Gtk.Align.START,
    });

    // A scrolled window so the text view can grow and scroll
    const scrolledWindow = new Gtk.ScrolledWindow({
      hexpand: true,
      min_content_height: 100, // Adjust as desired
    });

    // Multiline text view with word wrapping
    const textView = new Gtk.TextView({
      wrap_mode: Gtk.WrapMode.WORD_CHAR,
    });
    scrolledWindow.set_child(textView);


    // Retrieve the TextBuffer
    const textBuffer = textView.get_buffer();

    // 1) Load the existing GSettings value into the TextView
    const savedBlacklist = window._settings.get_string("item-blacklist");
    textBuffer.set_text(savedBlacklist, -1);

    // 2) Whenever the TextBuffer changes, store it back to GSettings
    textBuffer.connect("changed", () => {
      const startIter = textBuffer.get_start_iter();
      const endIter = textBuffer.get_end_iter();
      const text = textBuffer.get_text(startIter, endIter, /* include_hidden_chars */ true);

      // Save the entire multiline string as comma-separated
      // (You could also parse or validate it here if needed)
      window._settings.set_string("item-blacklist", text);
    });

    itemBlacklistBox.append(label);

    itemBlacklistBox.append(scrolledWindow);

    label = new Gtk.Label({
      label: _("Example") +":.bash_history,.rar,image,audio,video" ,
      hexpand: true,
      selectable: true,
      halign: Gtk.Align.START,
    });

    itemBlacklistBox.append(label);
    group.add(itemBlacklistBox);

        // Directory Blacklist (one per line)
    const dirBlacklistBox = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 10,
      margin_start: 10,
      margin_end: 10,
      margin_top: 10,
      margin_bottom: 10,
    });

    let dirLabel = new Gtk.Label({
      label: _("Directory blacklist (one per line)") + ":",
      hexpand: true,
      halign: Gtk.Align.START,
    });

    const dirScrolledWindow = new Gtk.ScrolledWindow({
      hexpand: true,
      min_content_height: 100,
    });

    const dirTextView = new Gtk.TextView({
      wrap_mode: Gtk.WrapMode.WORD_CHAR,
    });
    dirScrolledWindow.set_child(dirTextView);

    const dirTextBuffer = dirTextView.get_buffer();

    // Load existing value
    const savedDirBlacklist = window._settings.get_string("directory-blacklist");
    dirTextBuffer.set_text(savedDirBlacklist, -1);

    // Save on changes (normalized: one entry per line, trim empty lines)
    dirTextBuffer.connect("changed", () => {
      const startIter = dirTextBuffer.get_start_iter();
      const endIter = dirTextBuffer.get_end_iter();
      const rawText = dirTextBuffer.get_text(startIter, endIter, true);

      // Normalize: trim, remove empty lines, keep 1 entry per line
      const normalized = rawText
        .split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join("\n");

      window._settings.set_string("directory-blacklist", normalized);
    });

    dirBlacklistBox.append(dirLabel);
    dirBlacklistBox.append(dirScrolledWindow);

    const dirExample = new Gtk.Label({
      label: _("Example") + ": /tmp\n/var/log\n" + "~/Downloads",
      hexpand: true,
      selectable: true,
      halign: Gtk.Align.START,
    });

    dirBlacklistBox.append(dirExample);
    group.add(dirBlacklistBox);


  }
}
