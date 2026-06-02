#!/usr/bin/env python3
import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk

# Cache: Schlüssel ist die URI, Wert ein Tuple (visited, modified)
cached_items = {}

def get_item_timestamps(item):
    """
    Liefert für ein Gtk.RecentInfo-Objekt ein Tuple (visited, modified).
    Falls get_visited oder get_modified None zurückgeben, wird 0 verwendet.
    """
    visited = item.get_visited() or 0
    modified = item.get_modified() or 0
    return (visited, modified)

def on_recent_manager_changed(manager):
    global cached_items

    # Neue Items abrufen
    new_items = manager.get_items()
    new_cache = {}
    for item in new_items:
        uri = item.get_uri()
        if uri is not None:
            new_cache[uri] = get_item_timestamps(item)

    # Ermitteln, welche URIs hinzugefügt oder entfernt wurden
    new_uris = set(new_cache.keys())
    old_uris = set(cached_items.keys())

    added = new_uris - old_uris
    removed = old_uris - new_uris

    # Für Items, die in beiden Caches sind, prüfen, ob sich Zeitstempel geändert haben
    modified = []
    for uri in new_uris & old_uris:
        if cached_items[uri] != new_cache[uri]:
            modified.append(uri)

    if added or removed or modified:
        print("Änderungen bei den Recently Used Files:")
        if added:
            print("Hinzugefügte Items:")
            for uri in added:
                visited, modified_ts = new_cache[uri]
                print(f"  - {uri} (visited: {visited}, modified: {modified_ts})")
        if removed:
            print("Entfernte Items:")
            for uri in removed:
                visited, modified_ts = cached_items[uri]
                print(f"  - {uri} (visited: {visited}, modified: {modified_ts})")
        if modified:
            print("Geänderte Zeitstempel bei folgenden Items:")
            for uri in modified:
                old_visited, old_modified = cached_items[uri]
                new_visited, new_modified = new_cache[uri]
                print(f"  - {uri}")
                print(f"      alt: visited={old_visited}, modified={old_modified}")
                print(f"      neu: visited={new_visited}, modified={new_modified}")
    else:
        print("Keine Änderungen festgestellt.")
    print("-----")

    # Aktualisiere den Cache
    cached_items = new_cache

def main():
    global cached_items
    manager = Gtk.RecentManager.get_default()

    # Initialer Cache
    initial_items = manager.get_items()
    cached_items = {
        item.get_uri(): get_item_timestamps(item)
        for item in initial_items if item.get_uri() is not None
    }
    
    print("Initiale Recently Used Files:")
    for uri, (visited, modified_ts) in cached_items.items():
        print(f" - {uri} (visited: {visited}, modified: {modified_ts})")
    print("-----")

    # Signal verbinden
    manager.connect("changed", on_recent_manager_changed)

    print("Überwache Recently Used Files. Drücke Strg+C zum Beenden.")
    Gtk.main()

if __name__ == '__main__':
    main()
