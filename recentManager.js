
/*
    ENHANCED RECENT ITEMS, an extension for the gnome-shell.
    (c) 2024-2025 Lukas Gottschall; <https://lgo.io/> <https://github.com/lgoio/RecentItems>
    Gnome Shell Extensions: <https://extensions.gnome.org/>

    The original idea to use a GLib.BookmarkFile instead of the GTK RecentManager to comply with the GNOME Extensions guidelines came from BlankParticle.
    However, the original is a significantly simplified variant.
    BlankParticle's RecentManager: https://github.com/BlankParticle/RecentItems-gnome/blob/master/recentManager.js

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version. <http://www.gnu.org/licenses/>
*/
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import * as Signals from "resource:///org/gnome/shell/misc/signals.js";
import Mutex from "./mutex.js";

// Get the file extension in lowercase
function getFileExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function guessMimeType(ext) {
  let mime_type = null;
  
  // Check for known image types
  if (["png", "jpg", "jpeg", "gif", "bmp", "svg"].includes(ext)) {
    mime_type = ext === "svg" ? "image/svg+xml" : "image/" + (ext === "jpg" ? "jpeg" : ext);
  }
  // Check for common video types
  else if (["mp4", "avi", "mkv", "webm", "mov"].includes(ext)) {
    mime_type = "video/" + ext;
  }
  // Check for common audio types
  else if (["mp3", "wav", "ogg", "flac", "aac"].includes(ext)) {
    mime_type = "audio/" + ext;
  }
  else {
    mime_type = "application/octet-stream";
  }
  
  return mime_type;
}
export default class RecentManager extends Signals.EventEmitter {
  constructor() {
    super();
    this._bookmarkFilePath = GLib.get_home_dir() + "/.local/share/recently-used.xbel";
    this._bookmarkFileBackupPath = GLib.get_home_dir() + "/.local/share/recently-used.xbel.bak";
    this._bookmarkFileInterimsBackupPath = GLib.get_home_dir() + "/.local/share/recently-used.xbel.bak.interims";

    this._bookmarkFileFile = Gio.File.new_for_path(this._bookmarkFilePath);
    this._bookmarkFileBackup = Gio.File.new_for_path(this._bookmarkFileBackupPath);
    this._bookmarkFileInterimsBackup = Gio.File.new_for_path(this._bookmarkFileInterimsBackupPath);
    this._bookmarkFileMutex = new Mutex();
    this._bookmarkFileChanged = false;
    this.load_and_connect();

  }
  async _load_entries(restore=false) {
    if (this.fileExist(this._bookmarkFilePath)) {
      try {
        // Attempt to load the main bookmark file.
        this._bookmarkFile.load_from_file(this._bookmarkFilePath);
      } catch (e) {
        log(e, `Not working bookmark file: ${this._bookmarkFilePath}`);
        await this._recoverBookmarkFileBackup();
      }
    } else {
      console.log("Warning: bookmark file doesn't exist");
      // If the main bookmark file doesn't exist, restore it from backup or create it.
      await this._recoverBookmarkFileBackup();
    }
  }
  async _recoverBookmarkFileBackup() {
    // If loading fails, try to recover from backups.
    if (this.fileExist(this._bookmarkFileInterimsBackupPath)) {
      console.warn("Load interims backup bookmark file.");
      // disconnect from file monitoring
      this._disconnect();
      // Restore from temporary backup.
      await this.move(this._bookmarkFileInterimsBackup, this._bookmarkFileFile);
      // reconnect file monitoring
      await this.load_and_connect(); // this is not a endless loop cause the bookmark interims backup file doesn't exist on next recover
    } else if (this.fileExist(this._bookmarkFileBackupPath)) {
      console.warn("Load backup bookmark file.");
      // disconnect from file monitoring
      this._disconnect();
      // Restore from the regular backup.
      await this.move(this._bookmarkFileBackup, this._bookmarkFileFile);
      // reconnect file monitoring
      await this.load_and_connect(); // this is not a endless loop cause the bookmark backup file doesn't exist on next recover
    } else {
      // No working backup exists: delete the main file and create a new empty bookmark file.
      if(this.fileExist(this._bookmarkFilePath))
        this._bookmarkFileFile.delete(null);
      this._bookmarkFile.to_file(this._bookmarkFilePath);
      console.warn("No working backup found; created a new bookmark file.");
    }
  }
  async _reload_entries_if_changed() {
    if(this._bookmarkFileChanged) {
      this._bookmarkFileChanged = false;
      await this._load_entries();
    }
  }
  async load_and_connect(restore=false) {
      console.log("load_and_connect");

      this._bookmarkFile = new GLib.BookmarkFile();
      await this._load_entries(restore);
  
      this._fileMonitor = this._bookmarkFileFile.monitor(
        Gio.FileMonitorFlags.NONE,
        null,
      );
      this._changeThrottleTimeoutId = null;
      this._changedSignal = this._fileMonitor.connect("changed", () => {
        // If change is throttled, ignore the event
        if (this._changeThrottle) return;
        // Activate scroll throttle
        this._changeThrottle = true;
        // Reset throttle after 300 ms
        this._changeThrottleTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
          this._bookmarkFileChanged=true;
          this._changeThrottleTimeoutId = false;
          this._changeThrottle = false;
          console.log("emit changed");
          this.emit("changed");
          return GLib.SOURCE_REMOVE; // Run timeout only once
        });
      });
  }

  copy(source, destination) {
    return source.copy_async(destination,
      Gio.FileCopyFlags.OVERWRITE,
      GLib.G_PRIORITY_HIGH, null, null, null);
  }
  move(source, destination) {
    return source.move_async(destination,
      Gio.FileCopyFlags.OVERWRITE,
      GLib.G_PRIORITY_HIGH, null, null, null);
  }
  fileExist(filepath) {
    return GLib.file_test(filepath, GLib.FileTest.EXISTS);
  }
  async backup() {
    if (this.fileExist(this._bookmarkFilePath)) {
      // Wait for the lock, and receive the unlock function.
      let unlock = false;
      try {
        unlock = await this._bookmarkFileMutex.lock();
      } catch (e) {
        log(e);
        return;
      }
      try {
          await this.copy(this._bookmarkFileFile, this._bookmarkFileBackup);
      } catch (e) {
        logError(e);
      }
      finally {
          // Make sure to release the lock.
          // reconnect file monitoring
          await this.load_and_connect();
          unlock();
      }
    }
  }
  async restore() {
    if (this.fileExist(this._bookmarkFileBackupPath)) {

      // Wait for the lock, and receive the unlock function.
      let unlock = false;
      try {
        unlock = await this._bookmarkFileMutex.lock();
      } catch (e) {
        log(e);
        return;
      }
      // disconnect from file monitoring
      this._disconnect();
      try {
        // backup the bookmark file to a temporary to be able to restore the backup in case of failure
        if (this.fileExist(this._bookmarkFilePath)) {
          // do not use move here to prevent an automatic overwrite by the gtk recentmanager
          await this.copy(this._bookmarkFileFile, this._bookmarkFileInterimsBackup);
        }
        // restore the backup
        await this.move(this._bookmarkFileBackup, this._bookmarkFileFile);
      } finally {
        // Make sure to release the lock.
        // reconnect file monitoring
        await this.load_and_connect();
        unlock();
      }
    }
  }


  async get_items() {
    // Wait for the lock, and receive the unlock function.
    let unlock = false;
    try {
      unlock = await this._bookmarkFileMutex.lock();
    } catch (e) {
      log(e);
      return [];
    }
    try {
      await this._reload_entries_if_changed();
      return this._get_items();
    } finally {
      // Make sure to release the lock.
      unlock();
    }
  }
  _get_items() {
  	if (this._bookmarkFile === null) return {};
    return this._bookmarkFile.get_uris().map(uri => {
      try {

        const file = Gio.File.new_for_uri(uri);
        const fileExist = file.query_exists(null);
          // The file doesn't exist, fallback to bookmarkFile informations
        let displayName = this._bookmarkFile.get_title(uri);
        let mime_type = this._bookmarkFile.get_mime_type(uri);
        let visited = this._bookmarkFile.get_visited(uri);
        let modified= this._bookmarkFile.get_modified(uri);
        if(fileExist) {
          const info = file.query_info("standard::*,time::modified,time::access", Gio.FileQueryInfoFlags.NONE, null);
          visited = Math.max(info.get_attribute_uint64("time::access"), visited);
          modified = Math.max(info.get_attribute_uint64("time::modified"), modified);
          if (displayName == null) {
            displayName = info.get_display_name();
          }
          if (mime_type == null) {
            mime_type = info.get_content_type();
          }
        }
        if (displayName == null) {
          // Fallback: Extract the filename from the URI if no title is available
          displayName = decodeURIComponent(uri).replace(/^.*\//, ""); // Removes everything before the last `/`
        }
        let extension = getFileExtension(displayName);
        if (mime_type == null) {
          mime_type = guessMimeType(extension);
        }
        return {
          uri,
          exist: fileExist,
          displayName,
          visited,
          modified,
          extension,
          mime_type,
        };
      } catch (e) {
        log(e, `Failed to retrieve information for URI: ${uri}`);
        return null;
      }
    }).filter(item => item !== null);
  }

  async get_size() {
    await this._reload_entries_if_changed();
    // Wait for the lock, and receive the unlock function.
    let unlock = false;
    try {
      unlock = await this._bookmarkFileMutex.lock();
    } catch (e) {
      log(e);
      return 0;
    }
    try {
      return this._bookmarkFile.get_size();
    } finally {
      // Make sure to release the lock.
      unlock();
    }
  }

  async purge_items() {
    // Wait for the lock, and receive the unlock function.
    let unlock = false;
    try {
      unlock = await this._bookmarkFileMutex.lock();
    } catch (e) {
      log(e);
      return;
    }
    try {
      this._disconnect();
      this._bookmarkFileFile.delete(null);
      this._bookmarkFile.to_file(this._bookmarkFilePath);
    } finally {
      // reconnect file monitoring
      await this.load_and_connect();
      // Make sure to release the lock.
      unlock();
      this.emit("purged");
    }
  }
  async remove_items(uris) {
    await this._reload_entries_if_changed();
    // Wait for the lock, and receive the unlock function.
    let unlock = false;
    try {
      unlock = await this._bookmarkFileMutex.lock();
    } catch (e) {
      log(e);
      return;
    }
    
    let itemRemoved = false;
    try {
    	for (const uri of uris) { 
		    if (this._bookmarkFile.has_item(uri)) {
		      this._bookmarkFile.remove_item(uri);
		      itemRemoved = true;
		    }
      }
      this._bookmarkFile.to_file(this._bookmarkFilePath);
    } finally {
      // Make sure to release the lock.
      unlock();
      if(itemRemoved) {
		  	for (const uri of uris) { 
		      this.emit("item-removed", uri);
		    }
      }
    }
  }
  async remove_item(uri) {
    await this._reload_entries_if_changed();
    // Wait for the lock, and receive the unlock function.
    let unlock = false;
    try {
      unlock = await this._bookmarkFileMutex.lock();
    } catch (e) {
      log(e);
      return;
    }
    
    let itemRemoved = false;
    try {
      if (this._bookmarkFile.has_item(uri)) {
        this._bookmarkFile.remove_item(uri);
        this._bookmarkFile.to_file(this._bookmarkFilePath);
        itemRemoved = true;
      }
    } finally {
      // Make sure to release the lock.
      unlock();
      if(itemRemoved) {
        this.emit("item-removed", uri);
      }
    }
  }
  is_connected() {
    return this._bookmarkFile !== null;
  }

  _disconnect() {
    if(this._fileMonitor !== null) {
      this._fileMonitor.disconnect(this._changedSignal);
      this._fileMonitor.cancel();
      this._fileMonitor = null;
    } else {
      console.trace("Disconnect RecentManager without filemonitor");
    }
    if(this._bookmarkFile !== null)
    {
      this._bookmarkFile = null;
    } else {
      console.trace("Disconnect RecentManager without bookmarkFile");
    }

    // Remove change throttle timeout
    if (this._changeThrottleTimeoutId) {
      GLib.Source.remove(this._changeThrottleTimeoutId);
      this._changeThrottleTimeoutId = null;
    }
  }

  destroy() {
    this._disconnect();
    // unhandled promise rejections caused by mutex destroy are already ignored by extension.js RecentItems:destroy()
    this._bookmarkFileMutex.destroy();
  }
}
