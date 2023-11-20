// RECENT ITEMS, an extension for the gnome-shell.
// (C) 2011-2023 Kurt Fleisch; <https://www.bananenfisch.net/gnome/> <https://github.com/bananenfisch/RecentItems>
// Gnome Shell Extensions: <https://extensions.gnome.org/>

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version. <http://www.gnu.org/licenses/>

import Gio from "gi://Gio";
import GObject from "gi://GObject";
import St from "gi://St";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import { Extension, gettext as _ } from "resource:///org/gnome/shell/extensions/extension.js";
import RecentManager from "./recentManager.js";

export default class RecentItemsExtension extends Extension {
  constructor(metadata) {
    super(metadata);
  }

  enable() {
    this._settings = this.getSettings();
    this.rec = new RecentItems(this);
  }

  disable() {
    this.rec.destroy();
    this.rec = null;
  }
}

const PopupMenuItem = GObject.registerClass(
  class PopupMenuItem extends PopupMenu.PopupBaseMenuItem {
    constructor(gicon, text, params) {
      super(params);

      this.box = new St.BoxLayout({ style_class: "popup-combobox-item" });

      this.icon = gicon
        ? new St.Icon({ gicon, style_class: "popup-menu-icon" })
        : new St.Icon({ icon_name: "edit-clear-symbolic", icon_size: 22 });

      this.box.add(this.icon);
      this.label = new St.Label({ text: " " + text });
      this.box.add(this.label);
      this.add(this.box);
    }
  },
);

const RecentItems = GObject.registerClass(
  class RecentItems extends PanelMenu.Button {
    constructor(extension) {
      super(0.0);

      this._extension = extension;

      this._iconActor = new St.Icon({
        icon_name: "document-open-recent-symbolic",
        style_class: "system-status-icon",
      });

      this.add_actor(this._iconActor);
      this.add_style_class_name("panel-status-button");

      this.recentManager = new RecentManager();
      this._sync();

      this.changeHandler = this.recentManager.connect("changed", () => this._sync());
      this.settingsChangeHandler = this._extension._settings.connect("changed", () => this._sync());

      Main.panel.addToStatusArea(this._extension.uuid, this);
    }

    destroy() {
      this._extension._settings.disconnect(this.settingsChangeHandler);
      this.recentManager.disconnect(this.changeHandler);
      this.recentManager.destroy();
      super.destroy();
    }

    _sync() {
      this.menu.removeAll();

      const showItemCount = this._extension._settings.get_int("item-count");
      const moreItemCount = this._extension._settings.get_int("more-item-count");
      const itemBlacklist = this._extension._settings.get_string("item-blacklist");

      let items = this.recentManager.get_items();
      let modifiedList = [];
      let countItem = items.length;

      for (let i = 0; i < countItem; i++) {
        modifiedList[i] = new Array(2);
        modifiedList[i][0] = items[i].mtime.tv_sec;
        modifiedList[i][1] = i;
      }

      modifiedList.sort((x, y) => y[0] - x[0]);

      let id = 0;
      let id_show = 0;
      let blacklistString = itemBlacklist.replace(/\s/g, "");
      let blacklistList = blacklistString.split(",");

      while (id_show < showItemCount && id < countItem) {
        let item_type = items[modifiedList[id][1]].mime_type;
        if (blacklistList.indexOf(item_type.split("/")[0]) == -1) {
          let gicon = Gio.content_type_get_icon(item_type);
          let menuItem = new PopupMenuItem(gicon, items[modifiedList[id][1]].displayName, {});
          let uri = items[modifiedList[id][1]].uri;
          this.menu.addMenuItem(menuItem);
          menuItem.connect("activate", (_, ev) => {
            this._launchFile(uri, ev);
          });
          id_show++;
        }
        id++;
      }

      if (id < countItem && moreItemCount > 0) {
        this.moreItem = new PopupMenu.PopupSubMenuMenuItem(_("More..."));
        this.menu.addMenuItem(this.moreItem);
        while (id_show < showItemCount + moreItemCount && id < countItem) {
          let item_type = items[modifiedList[id][1]].mime_type;
          if (blacklistList.indexOf(item_type.split("/")[0]) == -1) {
            let gicon = Gio.content_type_get_icon(item_type);
            let menuItem = new PopupMenuItem(gicon, items[modifiedList[id][1]].displayName, {});
            let uri = items[modifiedList[id][1]].uri;
            this.moreItem.menu.addMenuItem(menuItem);
            menuItem.connect("activate", (_, ev) => {
              this._launchFile(uri, ev);
            });
            id_show++;
          }
          id++;
        }
      }

      if (countItem > 0) {
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        let menuItem = new PopupMenuItem(false, " Clear list", {});
        this.menu.addMenuItem(menuItem);
        menuItem.connect("activate", this._clearAll.bind(this));
      }
    }

    _launchFile(uri, ev) {
      Gio.app_info_launch_default_for_uri(
        ev.get_button() == 3
          ? Gio.Vfs.get_default().get_file_for_uri(uri).get_parent().get_uri()
          : uri,
        global.create_app_launch_context(0, -1),
      );
    }

    _clearAll() {
      this.recentManager.purge_items();
    }
  },
);
