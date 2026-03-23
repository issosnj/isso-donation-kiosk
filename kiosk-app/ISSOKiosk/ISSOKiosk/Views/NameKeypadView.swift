import SwiftUI

struct NameKeypadView: View {
    @Binding var name: String
    let onDismiss: () -> Void
    @State private var enteredName: String = ""

    var body: some View {
        KeyboardModal(
            title: "Name",
            inputDisplay: enteredName,
            placeholder: "Enter your name",
            canContinue: !enteredName.trimmingCharacters(in: .whitespaces).isEmpty,
            onCancel: onDismiss,
            onContinue: {
                name = enteredName
                onDismiss()
            },
            keyboardContent: {
                nameKeyboardContent
            }
        )
        .onAppear { enteredName = name }
    }

    private var nameKeyboardContent: some View {
        VStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
            HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                ForEach(["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"], id: \.self) { char in
                    TextKeypadButton(character: char, enteredText: $enteredName, capitalize: true)
                }
            }
            HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                ForEach(["A", "S", "D", "F", "G", "H", "J", "K", "L"], id: \.self) { char in
                    TextKeypadButton(character: char, enteredText: $enteredName, capitalize: true)
                }
            }
            HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                ForEach(["Z", "X", "C", "V", "B", "N", "M"], id: \.self) { char in
                    TextKeypadButton(character: char, enteredText: $enteredName, capitalize: true)
                }
            }
            HStack(spacing: DesignSystem.Components.keyboardKeySpacing) {
                KeyboardKeyButton(primaryLabel: "Space", action: { enteredName += " " })
                    .frame(maxWidth: .infinity)
                KeyboardKeyButton(systemImage: "delete.left.fill", action: {
                    if !enteredName.isEmpty { enteredName.removeLast() }
                })
            }
        }
        .padding(.horizontal, DesignSystem.Components.keyboardModalPaddingH)
        .padding(.bottom, DesignSystem.Spacing.md)
    }
}
