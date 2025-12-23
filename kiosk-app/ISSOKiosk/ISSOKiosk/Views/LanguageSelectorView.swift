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
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            // Textured background effect
            ZStack {
                Color(red: 0.98, green: 0.97, blue: 0.95) // Light beige/off-white
                // Subtle texture effect
                RoundedRectangle(cornerRadius: 8)
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color(red: 0.98, green: 0.97, blue: 0.95),
                                Color(red: 0.96, green: 0.95, blue: 0.93)
                            ]),
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
            }
        )
        .cornerRadius(8)
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

