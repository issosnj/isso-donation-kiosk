import SwiftUI

struct DeviceActivationView: View {
    @EnvironmentObject var appState: AppState
    @State private var deviceCode = ""
    @State private var isActivating = false
    @State private var errorMessage: String?
    
    var body: some View {
        VStack(spacing: 50) {
            Image(systemName: "qrcode.viewfinder")
                .font(.system(size: 120))
                .foregroundColor(.blue)
            
            VStack(spacing: 15) {
                Text("Enter Device Code")
                    .font(.system(size: 42, weight: .bold))
                
                Text("Enter the 8-character device code provided by your administrator")
                    .font(.system(size: 20))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 60)
            }
            
            VStack(spacing: 20) {
                TextField("Device Code", text: $deviceCode)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .font(.system(size: 36, weight: .semibold))
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: 400)
                    .padding(.horizontal, 30)
                    .padding(.vertical, 20)
                    .background(Color.white)
                    .cornerRadius(16)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(deviceCode.count == 8 ? Color.blue : Color.gray, lineWidth: 2)
                    )
                    .onChange(of: deviceCode) { newValue in
                        deviceCode = String(newValue.prefix(8).uppercased())
                    }
                
                if let error = errorMessage {
                    Text(error)
                        .font(.system(size: 18))
                        .foregroundColor(.red)
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(12)
                        .padding(.horizontal, 40)
                }
            }
            
            Button(action: activateDevice) {
                if isActivating {
                    HStack {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        Text("Activating...")
                            .font(.system(size: 20, weight: .semibold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: 400)
                    .padding(.vertical, 20)
                    .background(Color.blue.opacity(0.7))
                    .cornerRadius(16)
                } else {
                    Text("Activate Device")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundColor(.white)
                        .frame(maxWidth: 400)
                        .padding(.vertical, 20)
                        .background(deviceCode.count == 8 ? Color.blue : Color.gray)
                        .cornerRadius(16)
                }
            }
            .disabled(deviceCode.count != 8 || isActivating)
        }
        .padding(40)
    }
    
    private func activateDevice() {
        guard deviceCode.count == 8 else { return }
        
        isActivating = true
        errorMessage = nil
        
        Task {
            do {
                try await appState.activate(deviceCode: deviceCode)
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    isActivating = false
                }
            }
        }
    }
}

