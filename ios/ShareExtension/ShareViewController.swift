//
//  ShareViewController.swift
//  TagmentiaShareExtension
//
//  Share Extension to capture shared links (YouTube, TikTok, Instagram, Snapchat, etc.)
//  and hand them off to the main app via custom URL scheme + App Group storage.
//
//  IMPORTANT SETUP (in Xcode):
//  1) Add a Share Extension target (e.g., "TagmentiaShareExtension").
//  2) Enable App Groups for BOTH the main app target and this extension.
//     Use the same identifier, e.g., "group.app.lovable.tagmentia".
//  3) Set the extension's principal class to this file and replace the generated Swift file with this one.
//  4) Ensure the main app supports the custom scheme "tagmentia://" (already in capacitor.config).
//

import UIKit
import Social
import MobileCoreServices

class ShareViewController: SLComposeServiceViewController {
    
    // Update if you use a different App Group ID
    private let appGroupId = "group.app.lovable.tagmentia"
    private let pendingShareKey = "pendingShare"
    
    override func isContentValid() -> Bool {
        return true
    }
    
    override func didSelectPost() {
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let provider = item.attachments?.first else {
            extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
            return
        }
        
        // Try URL first
        if provider.hasItemConformingToTypeIdentifier(kUTTypeURL as String) {
            provider.loadItem(forTypeIdentifier: kUTTypeURL as String, options: nil) { [weak self] (item, error) in
                self?.handleLoadedItem(item, error: error)
            }
            return
        }
        
        // Fallback: plain text (may contain URL)
        if provider.hasItemConformingToTypeIdentifier(kUTTypeText as String) {
            provider.loadItem(forTypeIdentifier: kUTTypeText as String, options: nil) { [weak self] (item, error) in
                self?.handleLoadedItem(item, error: error)
            }
            return
        }
        
        // Unsupported type
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
    
    private func handleLoadedItem(_ item: NSSecureCoding?, error: Error?) {
        if let error = error {
            print("ShareExtension: loadItem error: \(error.localizedDescription)")
            complete()
            return
        }
        
        var urlString: String?
        
        if let url = item as? URL {
            urlString = url.absoluteString
        } else if let text = item as? String {
            // Try to extract a URL from the text
            urlString = extractUrl(from: text)?.absoluteString ?? text
        }
        
        guard let final = urlString, !final.isEmpty else {
            complete()
            return
        }
        
        // Persist for the main app (optional redundancy)
        let defaults = UserDefaults(suiteName: appGroupId)
        defaults?.set(final, forKey: pendingShareKey)
        defaults?.synchronize()
        
        // Open main app via custom scheme
        let encoded = final.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let appUrl = URL(string: "tagmentia://add?url=\(encoded)") {
            openInHostApp(appUrl)
        }
        
        complete()
    }
    
    private func extractUrl(from text: String) -> URL? {
        let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
        let matches = detector?.matches(in: text, options: [], range: NSRange(location: 0, length: text.utf16.count))
        return matches?.first?.url
    }
    
    private func openInHostApp(_ url: URL) {
        var responder: UIResponder? = self
        while responder != nil {
            if let app = responder as? UIApplication {
                app.open(url, options: [:], completionHandler: nil)
                break
            }
            responder = responder?.next
        }
    }
    
    private func complete() {
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
    
    override func configurationItems() -> [Any]! {
        return []
    }
}


