import GLib from "gi://GLib";
import Gio from "gi://Gio";
import * as Signals from "resource:///org/gnome/shell/misc/signals.js";

export default class RecentManager extends Signals.EventEmitter {
  constructor() {
    super();

    this._bookmarkFilePath = GLib.get_home_dir() + "/.local/share/recently-used.xbel";
    this._bookmarkFile = new GLib.BookmarkFile();
    this._load_entries();

    this._fileMonitor = Gio.File.new_for_path(this._bookmarkFilePath).monitor(
      Gio.FileMonitorFlags.NONE,
      null,
    );

    this._changedSignal = this._fileMonitor.connect("changed", () => {
      this._load_entries();
      this.emit("changed");
    });
  }

  _load_entries() {
    if (GLib.file_test(this._bookmarkFilePath, GLib.FileTest.EXISTS)) {
      this._bookmarkFile.load_from_file(this._bookmarkFilePath);
    } else {
      this._bookmarkFile.to_file(this._bookmarkFilePath);
    }
  }

  get_items() {
    return this._bookmarkFile
      .get_uris()
      .map((uri) => {
        try {
          const file = Gio.File.new_for_uri(uri);
          const info = file.query_info("standard::*", Gio.FileQueryInfoFlags.NONE, null);
          const displayName = info.get_display_name();
          const icon = info.get_icon();
          const mtime = info.get_modification_time();
          const mime_type = info.get_content_type();

          return {
            uri,
            displayName,
            icon,
            mtime,
            mime_type,
          };
        } catch {
          return null;
        }
      })
      .filter((item) => item !== null);
  }

  purge_items() {
    this._bookmarkFile.get_uris().forEach((uri) => {
      this._bookmarkFile.remove_item(uri);
    });
    this._bookmarkFile.to_file(this._bookmarkFilePath);
  }

  destroy() {
    this._fileMonitor.disconnect(this._changedSignal);
    this._fileMonitor.cancel();
    this._fileMonitor = null;
    this._bookmarkFile = null;
  }
}
