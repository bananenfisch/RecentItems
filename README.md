# RecentItems
Recent Items - an extension for gnome-shell
- left click to open file/folder
- right click to open containing folder

https://extensions.gnome.org/extension/72/recent-items/

TODOS:
- do not list deleted files (soon)
- shortcut, like <super>+r (soon)
- gui for settings (or simple xml-file for settings) (soon)
- search input field
- hide button after cleaning
- simple float right icon to remove an item from list
- option to pin files on top?

SETTINGS:

To change the default settings (10 items, 50 more-items, no blacklisting), go to the top of your extensions.js, should be here:

~/.local/share/gnome-shell/extensions/RecentItems@bananenfisch.net/extension.js  
or /usr/share/gnome-shell/extensions/RecentItems@bananenfisch.net/extension.js

const ITEMS = 10;       // number of items to list  
const MORE = 50;        // number of items to list under "more..."  
const BLACKLIST = "";   // to blacklist (hide) spezific MIME media types

If you set MORE = 0, there will be no "More..."-Button. Available media-types are: text, image, audio, video, application, multipart, message, model. You can define one or more (seperate with ",") types.

const BLACKLIST = "image";

To blacklist all images, videos and audios, you can use:
	
const BLACKLIST = "image,audio,video";

Don’t forget to restart the shell, after changing settings...
