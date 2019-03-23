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
const GObject = imports.gi.GObject;
const St = imports.gi.St;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;

function sortfunc(x,y)
{
    return y[0] - x[0];
}

var MyPopupMenuItem = class MyPopupMenuItem extends PopupMenu.PopupBaseMenuItem {

    constructor(gicon, text, params)
    {
        super(params);

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

var RecentItems = GObject.registerClass(
class RecentItems extends PanelMenu.Button {

    _init() {
        super._init(0.0);
        this.connect('destroy', this._onDestroy.bind(this));
        this._iconActor = new St.Icon({ icon_name: 'document-open-recent-symbolic',
                                        style_class: 'system-status-icon' });
        this.actor.add_actor(this._iconActor);
        this.actor.add_style_class_name('panel-status-button');

        this.RecentManager = new Gtk.RecentManager();
        this._display();

        this.conhandler = this.RecentManager.connect('changed', this._redisplay.bind(this));

        Main.panel.addToStatusArea('recent-items', this);
    }

    _onDestroy() {
        this.RecentManager.disconnect(this.conhandler);
    }

    _display() {

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
                let uri = items[modlist[id][1]].get_uri();
                this.menu.addMenuItem(menuItem);
                menuItem.connect('activate', (mItem, ev) => {
                    this._launchFile(uri);
                });
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
                    let uri = items[modlist[id][1]].get_uri();
                    this.moreItem.menu.addMenuItem(menuItem);
                    menuItem.connect('activate', (mItem, ev) => {
                        this._launchFile(uri);
                    });
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
            menuItem.connect('activate', this._clearAll.bind(this));
        }
    }

    _redisplay() {
        this.menu.removeAll();
        this._display();
    }

    _launchFile(uri) {
        Gio.app_info_launch_default_for_uri(uri, global.create_app_launch_context(0, -1));
    }

    _clearAll() {
        let GtkRecent = new Gtk.RecentManager();
        GtkRecent.purge_items();
    }
});

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
