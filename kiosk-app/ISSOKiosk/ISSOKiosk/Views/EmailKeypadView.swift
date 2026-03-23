import SwiftUI
import UIKit

struct EmailKeypadView: View {
    @Binding var email: String
    let onDismiss: () -> Void
    @State private var enteredEmail: String = ""
    @State private var selectedDomain: String? = nil

    private let emailDomains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"]

    var body: some View {
        KeyboardModal(
            title: "Email Address",
            inputDisplay: enteredEmail,
            placeholder: "username@domain.com",
            canContinue: !enteredEmail.isEmpty && isValidEmail(enteredEmail),
            onCancel: onDismiss,
            onContinue: {
                email = enteredEmail
                onDismiss()
            },
            keyboardContent: {
                emailKeyboardContent
            }
        )
        .onAppear { enteredEmail = email }
        .onChange(of: selectedDomain) { domain in
            if let domain = domain {
                let parts = enteredEmail.split(separator: "@")
                if let username = parts.first {
                    enteredEmail = "\(username)@\(domain)"
                } else {
                    enteredEmail = "\(enteredEmail)@\(domain)"
                }
                selectedDomain = nil
            }
        }
    }

    private var emailKeyboardContent: some View {
        VStack(spacing: DesignSystem.Spacing.md) {
            // Domain shortcuts — improved spacing and styling
            VStack(alignment: .leading, spacing: DesignSystem.Spacing.xs) {
                Text("Quick Add Domain")
                    .font(.custom(DesignSystem.Typography.labelFont, size: DesignSystem.Typography.labelSize))
                    .foregroundColor(Color(red: 0.5, green: 0.5, blue: 0.6))
                HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                    ForEach(emailDomains, id: \.self) { domain in
                        Button(action: {
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            selectedDomain = domain
                        }) {
                            Text("@\(domain)")
                                .font(.custom(DesignSystem.Typography.buttonFont, size: DesignSystem.Typography.secondarySize))
                                .foregroundColor(Color(red: 0.2, green: 0.4, blue: 0.8))
                                .frame(maxWidth: .infinity)
                                .frame(height: DesignSystem.Components.keyboardKeyHeight - 8)
                                .background(Color.white)
                                .cornerRadius(DesignSystem.Components.chipCornerRadius)
                                .overlay(
                                    RoundedRectangle(cornerRadius: DesignSystem.Components.chipCornerRadius)
                                        .stroke(Color(red: 0.2, green: 0.4, blue: 0.8).opacity(0.5), lineWidth: 1.5)
                                )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.horizontal, DesignSystem.Components.keyboardModalPaddingH)
            .padding(.bottom, DesignSystem.Spacing.xs)

            // QWERTY + numbers + @ .
            VStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                    ForEach(["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"], id: \.self) { char in
                        TextKeypadButton(character: char, enteredText: $enteredEmail)
                    }
                }
                HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                    ForEach(["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"], id: \.self) { char in
                        TextKeypadButton(character: char, enteredText: $enteredEmail)
                    }
                }
                HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                    ForEach(["A", "S", "D", "F", "G", "H", "J", "K", "L"], id: \.self) { char in
                        TextKeypadButton(character: char, enteredText: $enteredEmail)
                    }
                }
                HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                    ForEach(["Z", "X", "C", "V", "B", "N", "M"], id: \.self) { char in
                        TextKeypadButton(character: char, enteredText: $enteredEmail)
                    }
                    TextKeypadButton(character: "@", enteredText: $enteredEmail)
                    TextKeypadButton(character: ".", enteredText: $enteredEmail)
                }
                HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                    KeyboardKeyButton(primaryLabel: "Space", action: { enteredEmail += " " })
                        .frame(maxWidth: .infinity)
                    KeyboardKeyButton(systemImage: "delete.left.fill", action: {
                        if !enteredEmail.isEmpty { enteredEmail.removeLast() }
                    })
                }
            }
            .padding(.horizontal, DesignSystem.Components.keyboardModalPaddingH)
            .padding(.bottom, DesignSystem.Spacing.md)
        }
    }

    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
}
