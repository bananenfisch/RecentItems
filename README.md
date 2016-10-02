# RecentItems
Recent Items - an extension for gnome-shell

https://extensions.gnome.org/extension/72/recent-items/

TODOS:

- right-click on single entry: remove from list, show in folder
- search input field
- gui for settings
- hide button after cleaning
- folders?
- error-msg if file does not exist
- overview tab (like the extension for zeitgeist)?

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
