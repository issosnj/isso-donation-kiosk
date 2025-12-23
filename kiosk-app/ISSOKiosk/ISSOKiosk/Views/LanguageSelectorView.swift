import SwiftUI

struct LanguageSelectorView: View {
    @ObservedObject var languageManager: LanguageManager
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(AppLanguage.allCases.enumerated()), id: \.element) { index, language in
                Button(action: {
                    languageManager.setLanguage(language)
                }) {
                    Text(language.nativeName)
                        .font(.system(size: 18, weight: .bold, design: .serif))
                        .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20)) // Dark reddish-brown #423232
                }
                .buttonStyle(PlainButtonStyle())
                
                // Add vertical separator between languages (not after the last one)
                if index < AppLanguage.allCases.count - 1 {
                    Text("|")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(Color(red: 0.26, green: 0.20, blue: 0.20))
                        .padding(.horizontal, 8)
                }
            }
        }
    }
}

