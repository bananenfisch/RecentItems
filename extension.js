/*
    RECENT ITEMS (Version 15), an extension for the gnome-shell.
    (C) 2011-2016 Kurt Fleisch; <http://www.bananenfisch.net/gnome/>
    Gnome Shell Extensions: <https://extensions.gnome.org/>

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version. <http://www.gnu.org/licenses/>


    DEFINE YOUR SETTINGS HERE (restart the gnome-shell after changing...)
*/
const ITEMS = 10;       // number of items to list
const MORE = 50;        // number of items to list under "more..."
const BLACKLIST = "";   // to blacklist (hide) spezific MIME media types

/*
    available media-types are: text, image, audio, video, application, multipart, message, model.
    you can define one or more (seperate with ",") types.

    for example to blacklist all images use:
const BLACKLIST = "image";

    to blacklist all images, videos and audios, you can use:
const BLACKLIST = "image,audio,video";

    END OF SETTINGS SECTION
*/

const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const St = imports.gi.St;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;
const Lang = imports.lang;

function sortfunc(x,y)
{
  return y[0] - x[0];
}

function MyPopupMenuItem()
{
  this._init.apply(this, arguments);
}

MyPopupMenuItem.prototype =
{
    __proto__: PopupMenu.PopupBaseMenuItem.prototype,

    _init: function(gicon, text, params)
    {
        PopupMenu.PopupBaseMenuItem.prototype._init.call(this, params);

        this.box = new St.BoxLayout({ style_class: 'popup-combobox-item' });

        if (gicon)
          this.icon = new St.Icon({ gicon: gicon, style_class: 'popup-menu-icon' });
        else
          this.icon = new St.Icon({ icon_name: 'edit-clear-symbolic', icon_size: 22 });

        this.box.add(this.icon);
        this.label = new St.Label({ text: text });
        this.box.add(this.label);
        this.actor.add(this.box);
    }
};

function RecentItems()
{
  this._init.apply(this, arguments);
}

RecentItems.prototype =
{
    __proto__: PanelMenu.Button.prototype,
 
    _init: function()
    {
        PanelMenu.Button.prototype._init.call(this, 0.0);
        this.connect('destroy', Lang.bind(this, this._onDestroy));
        this._iconActor = new St.Icon({ icon_name: 'document-open-recent-symbolic',
                                        style_class: 'system-status-icon' });
        this.actor.add_actor(this._iconActor);
        this.actor.add_style_class_name('panel-status-button');

        this.RecentManager = new Gtk.RecentManager();
        this._display();

        this.conhandler = this.RecentManager.connect('changed', Lang.bind(this, this._redisplay));

        Main.panel.addToStatusArea('recent-items', this);
    },

    _onDestroy: function() {
        this.RecentManager.disconnect(this.conhandler);
    },

   _display: function()
   {

        let items = this.RecentManager.get_items();
        let modlist = new Array();
        let countItem = items.length;

        for (let i = 0; i < countItem; i++)
        {
          modlist[i] = new Array(2);
          modlist[i][0] = items[i].get_modified();
          modlist[i][1] = i;
        }

        modlist.sort(sortfunc);

        let id = 0;
        let idshow = 0;
        let blacklistString = BLACKLIST.replace(/\s/g, "");
        let blacklistList = blacklistString.split(",");

        while (idshow < ITEMS && id < countItem)
        {   let itemtype = items[modlist[id][1]].get_mime_type();
            if (blacklistList.indexOf((itemtype.split("/"))[0]) == -1)
            {
                let gicon = Gio.content_type_get_icon(itemtype);
                let menuItem = new MyPopupMenuItem(gicon, items[modlist[id][1]].get_display_name(), {});
                this.menu.addMenuItem(menuItem);
                menuItem.connect('activate', Lang.bind(this, this._launchFile, items[modlist[id][1]].get_uri()));
                idshow++;
            }
            id++;
        }

        if (id < countItem && MORE > 0)
        {
            this.moreItem = new PopupMenu.PopupSubMenuMenuItem(_("More..."));
            this.menu.addMenuItem(this.moreItem);
            while (idshow < ITEMS+MORE && id < countItem)
            {
                let itemtype = items[modlist[id][1]].get_mime_type();
                if (blacklistList.indexOf((itemtype.split("/"))[0]) == -1)
                {
                    let gicon = Gio.content_type_get_icon(itemtype);
                    let menuItem = new MyPopupMenuItem(gicon, items[modlist[id][1]].get_display_name(), {});
                    this.moreItem.menu.addMenuItem(menuItem);
                    menuItem.connect('activate', Lang.bind(this, this._launchFile, items[modlist[id][1]].get_uri()));
                    idshow++;
                }
                id++;
            }
        }

        if (countItem > 0)
        {
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
            let menuItem = new MyPopupMenuItem(false, 'Clear list', {});
            this.menu.addMenuItem(menuItem);
            menuItem.connect('activate', Lang.bind(this, this._clearAll));
        }
    },
    _redisplay: function()
    {
        this.menu.removeAll();
        this._display();
    },
    _launchFile: function(a, b, c)
    {
        Gio.app_info_launch_default_for_uri(c, global.create_app_launch_context(0, -1));
    },
    _clearAll: function()
    {
        let GtkRecent = new Gtk.RecentManager();
        GtkRecent.purge_items();
    },
};

function init()
{
}

let Rec;

function enable()
{
  Rec = new RecentItems();
}
function disable()
{
  Rec.destroy();
}
