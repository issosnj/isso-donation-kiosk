import SwiftUI

struct LanguageSelectorView: View {
    @ObservedObject var languageManager: LanguageManager
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Text("Select Language")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.primary)
                
                Spacer()
                
                Button(action: {
                    dismiss()
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.gray)
                }
            }
            .padding()
            .background(Color(.systemBackground))
            
            Divider()
            
            // Language Options
            ScrollView {
                VStack(spacing: 0) {
                    ForEach(AppLanguage.allCases, id: \.self) { language in
                        LanguageOptionRow(
                            language: language,
                            isSelected: languageManager.currentLanguage == language
                        ) {
                            languageManager.setLanguage(language)
                            dismiss()
                        }
                    }
                }
            }
        }
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(radius: 10)
        .frame(width: 400, height: 300)
    }
}

struct LanguageOptionRow: View {
    let language: AppLanguage
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(language.nativeName)
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(.primary)
                    
                    Text(language.displayName)
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.blue)
                }
            }
            .padding()
            .background(isSelected ? Color.blue.opacity(0.1) : Color.clear)
        }
        .buttonStyle(PlainButtonStyle())
        
        Divider()
            .padding(.leading)
    }
}

