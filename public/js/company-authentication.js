
$(document).ready(function () {
    function handleSectionToggle(checkSel, divSel) {
        $(checkSel).change(function () {
            if (this.checked) $(divSel).slideDown();
            else $(divSel).slideUp();
        });
        $(checkSel).change();
    }
    handleSectionToggle('#ldap_auth_enabled', '#ldap_config');
    handleSectionToggle('#imap_auth_enabled', '#imap_config');
});
