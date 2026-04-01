import SwiftUI

struct PhoneNumberKeypadView: View {
    @Binding var phoneNumber: String
    let onDismiss: () -> Void
    @State private var enteredPhone: String = ""

    var body: some View {
        KeyboardModal(
            title: "Phone Number",
            inputDisplay: enteredPhone,
            placeholder: "(000) - 000 - 0000",
            canContinue: enteredPhone.filter { $0.isNumber }.count >= 10,
            onCancel: onDismiss,
            onContinue: {
                phoneNumber = enteredPhone.filter { $0.isNumber }
                onDismiss()
            },
            keyboardContent: {
                phoneKeyboardContent
            }
        )
        .onAppear {
            let digits = phoneNumber.filter { $0.isNumber }
            enteredPhone = formatPhoneFromDigits(digits)
        }
    }

    private var phoneKeyboardContent: some View {
        VStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
            HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                phoneKey("1", letters: "")
                phoneKey("2", letters: "ABC")
                phoneKey("3", letters: "DEF")
            }
            HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                phoneKey("4", letters: "GHI")
                phoneKey("5", letters: "JKL")
                phoneKey("6", letters: "MNO")
            }
            HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                phoneKey("7", letters: "PQRS")
                phoneKey("8", letters: "TUV")
                phoneKey("9", letters: "WXYZ")
            }
            HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                phoneKey("0", letters: "+")
                KeyboardKeyButton(systemImage: "delete.left.fill", action: {
                    let digits = enteredPhone.filter { $0.isNumber }
                    if !digits.isEmpty {
                        enteredPhone = formatPhoneFromDigits(String(digits.dropLast()))
                    }
                })
            }
        }
        .padding(.horizontal, DesignSystem.Components.keyboardModalPaddingH)
        .padding(.bottom, DesignSystem.Spacing.md)
    }

    private func phoneKey(_ number: String, letters: String) -> some View {
        KeyboardKeyButton(primaryLabel: number, secondaryLabel: letters, action: {
            let digits = enteredPhone.filter { $0.isNumber }
            if digits.count < 10 {
                enteredPhone = formatPhoneFromDigits(digits + number)
            }
        })
    }

    private func formatPhoneFromDigits(_ digits: String) -> String {
        let d = String(digits.prefix(10).filter { $0.isNumber })
        guard !d.isEmpty else { return "" }
        if d.count <= 3 { return "(\(d)" }
        if d.count <= 6 {
            return "(\(String(d.prefix(3)))) - \(String(d.dropFirst(3)))"
        }
        let a = String(d.prefix(3))
        let m = String(d.dropFirst(3).prefix(3))
        let l = String(d.dropFirst(6))
        return "(\(a)) - \(m) - \(l)"
    }
}
